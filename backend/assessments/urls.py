from django.urls import path
from .views import (
    AssessmentStartAPIView,
    AssessmentSubmitAPIView,
    AssessmentDetailAPIView,
    AssessmentHistoryAPIView,
    ActiveAssessmentAPIView,
)

urlpatterns = [
    path('start/', AssessmentStartAPIView.as_view(), name='assessment-start'),
    path('active/', ActiveAssessmentAPIView.as_view(), name='assessment-active'),
    path('history/', AssessmentHistoryAPIView.as_view(), name='assessment-history'),
    path('<int:pk>/', AssessmentDetailAPIView.as_view(), name='assessment-detail'),
    path('<int:pk>/submit/', AssessmentSubmitAPIView.as_view(), name='assessment-submit'),
]
