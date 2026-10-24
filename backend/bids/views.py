from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Bid
from .serializers import BidSerializer, BidCreateSerializer
from .permissions import IsBidFreelancerOwner, CanReviewProjectBids
from projects.models import Project

class BidCreateAPIView(generics.CreateAPIView):
    """
    Private endpoint: Authenticated freelancers submit a proposal on an open project.
    """
    serializer_class = BidCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()


class FreelancerBidsListAPIView(generics.ListAPIView):
    """
    Private endpoint: Authenticated freelancer lists all proposals they have submitted.
    """
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, 'freelancer_profile', None)
        return Bid.objects.filter(freelancer=profile).select_related('project__customer', 'freelancer').prefetch_related('milestones')


class ProjectBidsListAPIView(generics.ListAPIView):
    """
    Private endpoint: Customer reviews all proposals submitted to one of their projects.
    """
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated, CanReviewProjectBids]

    def get_queryset(self):
        project_id = self.kwargs['project_id']
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return Bid.objects.none()

        self.check_object_permissions(self.request, project)
        return project.bids.select_related('freelancer__user', 'project').prefetch_related('milestones').order_by('-created_at')


class BidDetailAPIView(generics.RetrieveUpdateAPIView):
    """
    Private endpoint: Freelancer views or updates their proposal before selection.
    """
    queryset = Bid.objects.select_related('project', 'freelancer').prefetch_related('milestones').all()
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated, IsBidFreelancerOwner]

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance.status not in [Bid.Status.PENDING, Bid.Status.SHORTLISTED]:
            raise serializers.ValidationError("Cannot modify a proposal that has already been accepted or finalized.")
        serializer.save()


class BidActionAPIView(APIView):
    """
    Private endpoint: Customer shortlists or rejects a proposal.
    Action: 'SHORTLIST' | 'REJECT'
    """
    permission_classes = [permissions.IsAuthenticated, CanReviewProjectBids]

    def post(self, request, pk):
        try:
            bid = Bid.objects.select_related('project__customer').get(pk=pk)
        except Bid.DoesNotExist:
            return Response({'error': 'Proposal not found.'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, bid.project)

        action = request.data.get('action', '').upper()
        if action == 'SHORTLIST':
            bid.status = Bid.Status.SHORTLISTED
            bid.save()
            return Response({'message': 'Proposal shortlisted successfully.', 'status': bid.status})
        elif action == 'REJECT':
            bid.status = Bid.Status.REJECTED
            bid.save()
            return Response({'message': 'Proposal rejected.', 'status': bid.status})
        else:
            return Response({'error': "Invalid action. Supported: 'SHORTLIST', 'REJECT'."}, status=status.HTTP_400_BAD_REQUEST)


class BidWithdrawAPIView(APIView):
    """
    Private endpoint: Freelancer withdraws an active proposal.
    """
    permission_classes = [permissions.IsAuthenticated, IsBidFreelancerOwner]

    def post(self, request, pk):
        try:
            bid = Bid.objects.select_related('freelancer__user').get(pk=pk)
        except Bid.DoesNotExist:
            return Response({'error': 'Proposal not found.'}, status=status.HTTP_404_NOT_FOUND)

        self.check_object_permissions(request, bid)

        if bid.status == Bid.Status.ACCEPTED:
            return Response({'error': 'Cannot withdraw a proposal that has already been accepted into an active contract.'}, status=status.HTTP_400_BAD_REQUEST)

        bid.status = Bid.Status.WITHDRAWN
        bid.save()
        return Response({'message': 'Proposal withdrawn successfully.', 'status': bid.status})
