from django.urls import path
from .views import (
    BidCreateAPIView,
    FreelancerBidsListAPIView,
    ProjectBidsListAPIView,
    BidDetailAPIView,
    BidActionAPIView,
    BidWithdrawAPIView,
)

app_name = 'bids'

urlpatterns = [
    path('', BidCreateAPIView.as_view(), name='bid_create'),
    path('my/', FreelancerBidsListAPIView.as_view(), name='my_bids_alias'),
    path('my-bids/', FreelancerBidsListAPIView.as_view(), name='my_bids'),
    path('project/<int:project_id>/', ProjectBidsListAPIView.as_view(), name='project_bids'),
    path('<int:pk>/', BidDetailAPIView.as_view(), name='bid_detail'),
    path('<int:pk>/action/', BidActionAPIView.as_view(), name='bid_action'),
    path('<int:pk>/withdraw/', BidWithdrawAPIView.as_view(), name='bid_withdraw'),
]
