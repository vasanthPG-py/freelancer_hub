from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import Category, Skill, FreelancerProfile, CustomerProfile, Resume, Portfolio

class CategorySerializer(serializers.ModelSerializer):
    """Serializer for skill and project categories."""
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']


class SkillSerializer(serializers.ModelSerializer):
    """Serializer for individual technical competencies."""
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = Skill
        fields = ['id', 'name', 'slug', 'category', 'category_name', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']


class ResumeSerializer(serializers.ModelSerializer):
    """Serializer for uploaded resume document metadata."""
    class Meta:
        model = Resume
        fields = ['id', 'file', 'original_name', 'file_size', 'uploaded_at']
        read_only_fields = ['id', 'original_name', 'file_size', 'uploaded_at']


class PortfolioSerializer(serializers.ModelSerializer):
    """Serializer for showcase projects with many-to-many skills association."""
    skills_data = SkillSerializer(source='skills', many=True, read_only=True)
    skill_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.all(),
        source='skills',
        many=True,
        write_only=True,
        required=False
    )

    class Meta:
        model = Portfolio
        fields = [
            'id',
            'title',
            'description',
            'project_url',
            'image',
            'skills_data',
            'skill_ids',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class FreelancerProfileSerializer(serializers.ModelSerializer):
    """Comprehensive serializer for freelancer private workspace."""
    user = UserSerializer(read_only=True)
    skills_data = SkillSerializer(source='skills', many=True, read_only=True)
    skill_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.all(),
        source='skills',
        many=True,
        write_only=True,
        required=False
    )
    portfolio_items = PortfolioSerializer(many=True, read_only=True)
    resume = ResumeSerializer(read_only=True)

    class Meta:
        model = FreelancerProfile
        fields = [
            'id',
            'user',
            'title',
            'bio',
            'experience_level',
            'hourly_rate',
            'location',
            'resume_text',
            'skills_data',
            'skill_ids',
            'portfolio_items',
            'resume',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def update(self, instance, validated_data):
        skills = validated_data.pop('skills', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if skills is not None:
            instance.skills.set(skills)
        return instance


class CustomerProfileSerializer(serializers.ModelSerializer):
    """Comprehensive serializer for customer profile workspace."""
    user = UserSerializer(read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            'id',
            'user',
            'company_name',
            'company_bio',
            'website',
            'location',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class FreelancerPublicProfileSerializer(serializers.ModelSerializer):
    """Sanitized public profile representation for clients and marketplace search."""
    full_name = serializers.ReadOnlyField(source='user.full_name')
    is_verified = serializers.ReadOnlyField(source='user.is_verified')
    skills = SkillSerializer(many=True, read_only=True)
    portfolio_items = PortfolioSerializer(many=True, read_only=True)

    class Meta:
        model = FreelancerProfile
        fields = [
            'id',
            'full_name',
            'is_verified',
            'title',
            'bio',
            'experience_level',
            'hourly_rate',
            'location',
            'skills',
            'portfolio_items',
            'created_at',
        ]
        read_only_fields = fields
