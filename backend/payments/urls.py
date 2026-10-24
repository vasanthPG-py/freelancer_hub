from django.urls import path
from .views import (
    TransactionListAPIView,
    TransactionDetailAPIView,
    SimulateMilestonePaymentAPIView,
)

app_name = 'payments'

urlpatterns = [
    path('transactions/', TransactionListAPIView.as_view(), name='transaction-list'),
    path('transactions/<int:pk>/', TransactionDetailAPIView.as_view(), name='transaction-detail'),
    path('simulate-payment/', SimulateMilestonePaymentAPIView.as_view(), name='simulate-payment'),
]
