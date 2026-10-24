from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from django.db import transaction

from .models import Project, Contract, Milestone
from .serializers import (
    ProjectSerializer,
    ProjectCreateSerializer,
    ContractSerializer,
    MilestoneSerializer,
    HireFreelancerSerializer,
)
from .permissions import IsProjectCustomerOwner, CanManageMilestone
from bids.models import Bid
from accounts.models import User

class ProjectListCreateAPIView(generics.ListCreateAPIView):
    """
    Public GET: Faceted search and filtering for open marketplace projects.
    Protected POST: Customer accounts create new project listings.
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsProjectCustomerOwner()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProjectCreateSerializer
        return ProjectSerializer

    def get_queryset(self):
        queryset = Project.objects.select_related('customer', 'category').prefetch_related('skills', 'bids').all()

        # Public list default filter: show OPEN projects
        status_param = self.request.query_params.get('status', Project.Status.OPEN)
        if status_param != 'ALL':
            queryset = queryset.filter(status=status_param)

        # Category filter
        cat = self.request.query_params.get('category')
        if cat:
            if cat.isdigit():
                queryset = queryset.filter(category_id=cat)
            else:
                queryset = queryset.filter(category__slug=cat)

        # Skills filter (comma-delimited list of skill IDs or names)
        skills = self.request.query_params.get('skills')
        if skills:
            skill_list = [s.strip() for s in skills.split(',') if s.strip()]
            for sk in skill_list:
                if sk.isdigit():
                    queryset = queryset.filter(skills__id=sk)
                else:
                    queryset = queryset.filter(skills__slug=sk)

        # Budget filters
        min_budget = self.request.query_params.get('min_budget')
        if min_budget:
            queryset = queryset.filter(budget__gte=min_budget)

        max_budget = self.request.query_params.get('max_budget')
        if max_budget:
            queryset = queryset.filter(budget__lte=max_budget)

        # Experience level filter
        exp = self.request.query_params.get('experience_level')
        if exp:
            queryset = queryset.filter(experience_level=exp)

        # Search query (title and description)
        search_query = self.request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) | Q(description__icontains=search_query)
            )

        # Ordering
        ordering = self.request.query_params.get('ordering', '-created_at')
        if ordering in ['created_at', '-created_at', 'budget', '-budget', 'deadline', '-deadline']:
            queryset = queryset.order_by(ordering)

        return queryset.distinct()

    def perform_create(self, serializer):
        customer_profile = getattr(self.request.user, 'customer_profile', None)
        serializer.save(customer=customer_profile)


class ProjectDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    Public GET: Retrieve single project details.
    Protected PUT/PATCH/DELETE: Customer owner modifies or removes project.
    """
    queryset = Project.objects.select_related('customer', 'category').prefetch_related('skills', 'bids').all()
    serializer_class = ProjectSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsProjectCustomerOwner()]


class CustomerProjectsAPIView(generics.ListAPIView):
    """
    Private endpoint: List all projects posted by the authenticated customer.
    """
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectCustomerOwner]

    def get_queryset(self):
        customer_profile = getattr(self.request.user, 'customer_profile', None)
        return Project.objects.filter(customer=customer_profile).select_related('category').prefetch_related('skills', 'bids')


class HireFreelancerAPIView(APIView):
    """
    Private endpoint: Customer accepts a proposal, forming an active contract
    and creating the deliverable milestones.
    """
    permission_classes = [permissions.IsAuthenticated, IsProjectCustomerOwner]

    @transaction.atomic
    def post(self, request, pk):
        try:
            project = Project.objects.select_related('customer').get(pk=pk)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)

        if project.customer.user != request.user:
            return Response({'error': 'Unauthorized to hire on this project.'}, status=status.HTTP_403_FORBIDDEN)

        if project.status == Project.Status.IN_PROGRESS:
            return Response({'error': 'A freelancer has already been hired for this project.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = HireFreelancerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        bid_id = serializer.validated_data['bid_id']
        try:
            bid = Bid.objects.select_related('freelancer').get(pk=bid_id, project=project)
        except Bid.DoesNotExist:
            return Response({'error': 'Specified proposal does not exist on this project.'}, status=status.HTTP_404_NOT_FOUND)

        # 1. Update Project status
        project.status = Project.Status.IN_PROGRESS
        project.save()

        # 2. Update accepted Bid and reject other active bids
        bid.status = Bid.Status.ACCEPTED
        bid.save()

        project.bids.exclude(pk=bid.id).filter(
            status__in=[Bid.Status.PENDING, Bid.Status.SHORTLISTED]
        ).update(status=Bid.Status.REJECTED)

        # 3. Create Contract
        contract = Contract.objects.create(
            project=project,
            customer=project.customer,
            freelancer=bid.freelancer,
            accepted_bid=bid,
            total_amount=bid.bid_amount,
            status=Contract.Status.ACTIVE
        )

        # 4. Generate Milestones from bid proposals or create primary milestone
        bid_milestones = bid.milestones.all()
        if bid_milestones.exists():
            for bm in bid_milestones:
                Milestone.objects.create(
                    contract=contract,
                    title=bm.title,
                    amount=bm.amount,
                    status=Milestone.Status.FUNDED # Funded in simulated escrow
                )
        else:
            Milestone.objects.create(
                contract=contract,
                title=f"Delivery of {project.title}",
                amount=contract.total_amount,
                status=Milestone.Status.FUNDED
            )

        return Response({
            'message': f"Successfully hired {bid.freelancer.user.full_name} for '{project.title}'.",
            'contract': ContractSerializer(contract).data,
        }, status=status.HTTP_201_CREATED)


class ContractListAPIView(generics.ListAPIView):
    """
    Private endpoint: List contracts for either customer or freelancer user.
    """
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.CUSTOMER:
            return Contract.objects.filter(customer__user=user).select_related('project', 'freelancer', 'customer').prefetch_related('milestones')
        elif user.role == User.Role.FREELANCER:
            return Contract.objects.filter(freelancer__user=user).select_related('project', 'customer', 'freelancer').prefetch_related('milestones')
        return Contract.objects.none()


class MilestoneStatusUpdateAPIView(APIView):
    """
    Private endpoint: Update milestone status (submit deliverable, approve milestone).
    """
    permission_classes = [permissions.IsAuthenticated, CanManageMilestone]

    def patch(self, request, pk):
        try:
            milestone = Milestone.objects.select_related('contract__customer', 'contract__freelancer').get(pk=pk)
        except Milestone.DoesNotExist:
            return Response({'error': 'Milestone not found.'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, milestone)
        target_status = request.data.get('status')

        if target_status not in [Milestone.Status.SUBMITTED, Milestone.Status.APPROVED]:
            return Response({'error': f"Invalid status transition to '{target_status}'."}, status=status.HTTP_400_BAD_REQUEST)

        # Freelancer submits work for review
        if target_status == Milestone.Status.SUBMITTED:
            if request.user != milestone.contract.freelancer.user:
                return Response({'error': 'Only the hired freelancer can submit milestone deliverables.'}, status=status.HTTP_403_FORBIDDEN)
            milestone.status = Milestone.Status.SUBMITTED
            milestone.save()

        # Customer approves and releases funds
        elif target_status == Milestone.Status.APPROVED:
            if request.user != milestone.contract.customer.user:
                return Response({'error': 'Only the client customer can approve milestone release.'}, status=status.HTTP_403_FORBIDDEN)
            milestone.status = Milestone.Status.APPROVED
            milestone.save()

            # Check if all milestones for contract are approved; if so, mark contract COMPLETED
            all_approved = not milestone.contract.milestones.exclude(status=Milestone.Status.APPROVED).exists()
            if all_approved:
                milestone.contract.status = Contract.Status.COMPLETED
                milestone.contract.save()
                milestone.contract.project.status = Project.Status.COMPLETED
                milestone.contract.project.save()

        return Response({
            'message': f"Milestone updated to {milestone.get_status_display()}.",
            'milestone': MilestoneSerializer(milestone).data,
        }, status=status.HTTP_200_OK)
