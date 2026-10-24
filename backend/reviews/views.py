from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Avg

from .models import Review
from .serializers import ReviewSerializer, ReviewCreateSerializer
from projects.models import Contract
from accounts.models import User


class ReviewCreateAPIView(APIView):
    """Submit a review for a completed contract."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        contract_id = serializer.validated_data['contract'].id
        try:
            contract = Contract.objects.select_related(
                'customer__user', 'freelancer__user'
            ).get(pk=contract_id)
        except Contract.DoesNotExist:
            return Response({'error': 'Contract not found.'}, status=status.HTTP_404_NOT_FOUND)

        if contract.status != Contract.Status.COMPLETED:
            return Response(
                {'error': 'Reviews can only be submitted for completed contracts.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        # Determine direction and reviewee
        if user == contract.customer.user:
            direction = Review.ReviewerRole.CUSTOMER_REVIEWING_FREELANCER
            reviewee = contract.freelancer.user
        elif user == contract.freelancer.user:
            direction = Review.ReviewerRole.FREELANCER_REVIEWING_CUSTOMER
            reviewee = contract.customer.user
        else:
            return Response({'error': 'You are not a participant in this contract.'}, status=status.HTTP_403_FORBIDDEN)

        # Check for duplicate
        if Review.objects.filter(contract=contract, reviewer=user).exists():
            return Response({'error': 'You have already submitted a review for this contract.'}, status=status.HTTP_409_CONFLICT)

        review = Review.objects.create(
            contract=contract,
            reviewer=user,
            reviewee=reviewee,
            direction=direction,
            **{k: v for k, v in serializer.validated_data.items() if k != 'contract'}
        )

        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class UserReviewsListAPIView(generics.ListAPIView):
    """List public reviews received by a specific user."""
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return Review.objects.filter(
            reviewee_id=user_id,
            is_public=True
        ).select_related('reviewer').order_by('-created_at')


class FreelancerRatingSummaryAPIView(APIView):
    """Get average ratings summary for a freelancer."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, user_id):
        reviews = Review.objects.filter(
            reviewee_id=user_id,
            direction=Review.ReviewerRole.CUSTOMER_REVIEWING_FREELANCER,
            is_public=True
        )
        stats = reviews.aggregate(
            avg_overall=Avg('overall_rating'),
            avg_communication=Avg('communication_rating'),
            avg_quality=Avg('quality_rating'),
            avg_timeliness=Avg('timeliness_rating'),
        )
        return Response({
            'total_reviews': reviews.count(),
            'average_rating': round(stats['avg_overall'] or 0, 2),
            'communication': round(stats['avg_communication'] or 0, 2),
            'quality': round(stats['avg_quality'] or 0, 2),
            'timeliness': round(stats['avg_timeliness'] or 0, 2),
        })
