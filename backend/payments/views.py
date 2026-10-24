from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from .models import Transaction
from .serializers import TransactionSerializer, SimulatePaymentRequestSerializer
from projects.models import Contract, Milestone
from messaging.models import Notification


class TransactionListAPIView(APIView):
    """
    List all simulated transactions for the authenticated user (as payer or recipient).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        transactions = Transaction.objects.filter(
            Q(payer=user) | Q(recipient=user)
        ).select_related('contract__project', 'milestone', 'payer', 'recipient')
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)


class TransactionDetailAPIView(APIView):
    """
    Retrieve single transaction details for an authorized party.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        tx = get_object_or_404(
            Transaction.objects.select_related('contract__project', 'milestone', 'payer', 'recipient'),
            pk=pk
        )
        if tx.payer != user and tx.recipient != user and not user.is_staff:
            return Response(
                {"detail": "You do not have permission to view this transaction."},
                status=status.HTTP_403_FORBIDDEN
            )
        return Response(TransactionSerializer(tx).data)


class SimulateMilestonePaymentAPIView(APIView):
    """
    Customer simulated payment workflow for milestone approval & payout release.
    Clearly simulated: zero real payment gateway, instant test ledger credit.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = SimulatePaymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        contract = get_object_or_404(
            Contract.objects.select_related('customer__user', 'freelancer__user', 'project'),
            pk=data['contract_id']
        )

        # Enforce that only contract customer can trigger simulated payment
        if contract.customer.user != request.user:
            return Response(
                {"detail": "Only the hiring customer may authorize milestone payouts."},
                status=status.HTTP_403_FORBIDDEN
            )

        milestone = None
        if data.get('milestone_id'):
            milestone = get_object_or_404(Milestone, pk=data['milestone_id'], contract=contract)
            milestone.status = Milestone.Status.APPROVED
            milestone.save(update_fields=['status'])

        # Create simulated ledger record
        tx = Transaction.objects.create(
            contract=contract,
            milestone=milestone,
            payer=contract.customer.user,
            recipient=contract.freelancer.user,
            amount=data['amount'],
            transaction_type=data['transaction_type'],
            status=Transaction.Status.COMPLETED,
            note=data.get('note', 'Simulated milestone payout release.') or 'Simulated milestone payout release.',
            is_simulated=True,
        )

        # Send notification to freelancer
        Notification.objects.create(
            user=contract.freelancer.user,
            notification_type=Notification.NotificationType.MILESTONE,
            title="Simulated Payment Released",
            message=f"Customer {contract.customer.company_name or contract.customer.user.email} approved milestone '{milestone.title if milestone else contract.project.title}' and released simulated payment of ${tx.amount}.",
            link="/freelancer/dashboard"
        )

        return Response(
            {
                "message": "Simulated payment successfully processed.",
                "transaction": TransactionSerializer(tx).data,
            },
            status=status.HTTP_201_CREATED
        )
