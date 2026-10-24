from django.urls import path
from .views import (
    ProjectListCreateAPIView,
    ProjectDetailAPIView,
    CustomerProjectsAPIView,
    HireFreelancerAPIView,
    ContractListAPIView,
    MilestoneStatusUpdateAPIView,
)

app_name = 'projects'

urlpatterns = [
    path('', ProjectListCreateAPIView.as_view(), name='project_list_create'),
    path('<int:pk>/', ProjectDetailAPIView.as_view(), name='project_detail'),
    path('my/', CustomerProjectsAPIView.as_view(), name='customer_projects_alias'),
    path('my-projects/', CustomerProjectsAPIView.as_view(), name='customer_projects'),
    path('<int:pk>/hire/', HireFreelancerAPIView.as_view(), name='hire_freelancer'),
    path('contracts/', ContractListAPIView.as_view(), name='contract_list'),
    path('milestones/<int:pk>/', MilestoneStatusUpdateAPIView.as_view(), name='milestone_status_alias'),
    path('milestones/<int:pk>/status/', MilestoneStatusUpdateAPIView.as_view(), name='milestone_status'),
]
