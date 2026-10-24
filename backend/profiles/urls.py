from django.urls import path
from .views import (
    CategoryListAPIView,
    SkillListAPIView,
    FreelancerProfileAPIView,
    CustomerProfileAPIView,
    FreelancerPublicProfileAPIView,
    ResumeUploadAPIView,
    PortfolioListCreateAPIView,
    PortfolioDetailAPIView,
)

app_name = 'profiles'

urlpatterns = [
    path('categories/', CategoryListAPIView.as_view(), name='category_list'),
    path('skills/', SkillListAPIView.as_view(), name='skill_list'),
    path('freelancer/', FreelancerProfileAPIView.as_view(), name='freelancer_profile'),
    path('customer/', CustomerProfileAPIView.as_view(), name='customer_profile'),
    path('freelancers/<int:pk>/', FreelancerPublicProfileAPIView.as_view(), name='freelancer_public_detail'),
    path('resume/', ResumeUploadAPIView.as_view(), name='resume_detail'),
    path('resume/upload/', ResumeUploadAPIView.as_view(), name='resume_upload'),
    path('portfolio/', PortfolioListCreateAPIView.as_view(), name='portfolio_list_create'),
    path('portfolio/<int:pk>/', PortfolioDetailAPIView.as_view(), name='portfolio_detail'),
]
