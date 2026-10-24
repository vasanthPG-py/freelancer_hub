import os
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Category, Skill, FreelancerProfile, CustomerProfile, Resume, Portfolio
from .serializers import (
    CategorySerializer,
    SkillSerializer,
    FreelancerProfileSerializer,
    CustomerProfileSerializer,
    FreelancerPublicProfileSerializer,
    ResumeSerializer,
    PortfolioSerializer,
)
from .permissions import IsFreelancerOwner, IsCustomerOwner
from .validators import validate_resume_file


class CategoryListAPIView(generics.ListAPIView):
    """Public endpoint: List all skill and project categories."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class SkillListAPIView(generics.ListAPIView):
    """
    Public endpoint: List skills, optionally filtered by category.
    Query param: ?category=<category_slug_or_id>
    """
    serializer_class = SkillSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        queryset = Skill.objects.select_related('category').all()
        cat_param = self.request.query_params.get('category')
        if cat_param:
            if cat_param.isdigit():
                queryset = queryset.filter(category_id=cat_param)
            else:
                queryset = queryset.filter(category__slug=cat_param)
        return queryset


class FreelancerProfileAPIView(generics.RetrieveUpdateAPIView):
    """
    Private endpoint: Manage currently authenticated freelancer's profile.
    """
    serializer_class = FreelancerProfileSerializer
    permission_classes = [IsFreelancerOwner]

    def get_object(self):
        profile, _ = FreelancerProfile.objects.get_or_create(user=self.request.user)
        return profile


class CustomerProfileAPIView(generics.RetrieveUpdateAPIView):
    """
    Private endpoint: Manage currently authenticated customer's profile.
    """
    serializer_class = CustomerProfileSerializer
    permission_classes = [IsCustomerOwner]

    def get_object(self):
        profile, _ = CustomerProfile.objects.get_or_create(user=self.request.user)
        return profile


class FreelancerPublicProfileAPIView(generics.RetrieveAPIView):
    """
    Public endpoint: Retrieve public freelancer profile with verified badges, skills, and portfolios.
    """
    queryset = FreelancerProfile.objects.select_related('user').prefetch_related('skills', 'portfolio_items').all()
    serializer_class = FreelancerPublicProfileSerializer
    permission_classes = [permissions.AllowAny]


class ResumeUploadAPIView(APIView):
    """
    Private endpoint: Upload or inspect freelancer resume document.
    Validates file extension (.pdf, .docx, .txt) and file size (<= 5MB).
    """
    permission_classes = [IsFreelancerOwner]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        profile, _ = FreelancerProfile.objects.get_or_create(user=request.user)
        if hasattr(profile, 'resume'):
            return Response(ResumeSerializer(profile.resume).data)
        return Response({'message': 'No resume uploaded yet.'}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        profile, _ = FreelancerProfile.objects.get_or_create(user=request.user)
        uploaded_file = request.FILES.get('file')

        if not uploaded_file:
            return Response({'error': 'No file was provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_resume_file(uploaded_file)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Attempt to read text content if plain-text
        ext = os.path.splitext(uploaded_file.name)[1].lower()
        extracted_text = ''
        if ext == '.txt':
            try:
                extracted_text = uploaded_file.read().decode('utf-8', errors='ignore')
                uploaded_file.seek(0)
            except Exception:
                extracted_text = ''
        else:
            extracted_text = f"Resume Document: {uploaded_file.name}. Technical skills: {', '.join(s.name for s in profile.skills.all())}."

        # If a previous resume exists, delete the old file
        if hasattr(profile, 'resume'):
            try:
                profile.resume.file.delete(save=False)
            except Exception:
                pass
            resume_obj = profile.resume
            resume_obj.file = uploaded_file
            resume_obj.original_name = uploaded_file.name
            resume_obj.file_size = uploaded_file.size
            resume_obj.save()
        else:
            resume_obj = Resume.objects.create(
                freelancer=profile,
                file=uploaded_file,
                original_name=uploaded_file.name,
                file_size=uploaded_file.size,
            )

        if extracted_text and not profile.resume_text:
            profile.resume_text = extracted_text
            profile.save()

        return Response({
            'message': 'Resume successfully uploaded and verified.',
            'resume': ResumeSerializer(resume_obj).data,
            'resume_text': profile.resume_text,
        }, status=status.HTTP_201_CREATED)


class PortfolioListCreateAPIView(generics.ListCreateAPIView):
    """
    Private endpoint: List and create portfolio projects for authenticated freelancer.
    """
    serializer_class = PortfolioSerializer
    permission_classes = [IsFreelancerOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        profile, _ = FreelancerProfile.objects.get_or_create(user=self.request.user)
        return profile.portfolio_items.all()

    def perform_create(self, serializer):
        profile, _ = FreelancerProfile.objects.get_or_create(user=self.request.user)
        serializer.save(freelancer=profile)


class PortfolioDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    Private endpoint: Manage single portfolio item.
    """
    serializer_class = PortfolioSerializer
    permission_classes = [IsFreelancerOwner]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        profile, _ = FreelancerProfile.objects.get_or_create(user=self.request.user)
        return profile.portfolio_items.all()
