from django.urls import path
from .views import ReviewCreateAPIView, UserReviewsListAPIView, FreelancerRatingSummaryAPIView

urlpatterns = [
    path('', ReviewCreateAPIView.as_view(), name='review-create'),
    path('user/<int:user_id>/', UserReviewsListAPIView.as_view(), name='user-reviews'),
    path('user/<int:user_id>/summary/', FreelancerRatingSummaryAPIView.as_view(), name='user-rating-summary'),
]
