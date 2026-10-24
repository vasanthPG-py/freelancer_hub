from rest_framework import serializers
from django.utils import timezone
from profiles.serializers import CategorySerializer, SkillSerializer, CustomerProfileSerializer, FreelancerPublicProfileSerializer
from profiles.models import Category, Skill, CustomerProfile
from .models import Project, Contract, Milestone

class MilestoneSerializer(serializers.ModelSerializer):
    """Deliverable milestone serializer."""
    class Meta:
        model = Milestone
        fields = [
            'id',
            'contract',
            'title',
            'description',
            'amount',
            'due_date',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'contract', 'created_at', 'updated_at']


class ContractSerializer(serializers.ModelSerializer):
    """Contract serializer connecting project, customer, freelancer, and milestones."""
    customer_data = CustomerProfileSerializer(source='customer', read_only=True)
    freelancer_data = FreelancerPublicProfileSerializer(source='freelancer', read_only=True)
    milestones = MilestoneSerializer(many=True, read_only=True)
    project_title = serializers.ReadOnlyField(source='project.title')

    class Meta:
        model = Contract
        fields = [
            'id',
            'project',
            'project_title',
            'customer',
            'customer_data',
            'freelancer',
            'freelancer_data',
            'accepted_bid',
            'total_amount',
            'status',
            'milestones',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectSerializer(serializers.ModelSerializer):
    """Public and detailed view of a project listing."""
    customer_name = serializers.ReadOnlyField(source='customer.company_name')
    customer_location = serializers.ReadOnlyField(source='customer.location')
    category_name = serializers.ReadOnlyField(source='category.name')
    skills_data = SkillSerializer(source='skills', many=True, read_only=True)
    bids_count = serializers.ReadOnlyField()
    is_open = serializers.ReadOnlyField()

    class Meta:
        model = Project
        fields = [
            'id',
            'customer',
            'customer_name',
            'customer_location',
            'title',
            'description',
            'category',
            'category_name',
            'budget',
            'experience_level',
            'deadline',
            'status',
            'skills_data',
            'bids_count',
            'is_open',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'customer', 'status', 'created_at', 'updated_at']


class ProjectCreateSerializer(serializers.ModelSerializer):
    """Validates project creation by a customer account."""
    skill_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.all(),
        source='skills',
        many=True,
        required=False
    )

    class Meta:
        model = Project
        fields = [
            'id',
            'title',
            'description',
            'category',
            'budget',
            'experience_level',
            'deadline',
            'skill_ids',
        ]

    def validate_budget(self, value):
        if value <= 0:
            raise serializers.ValidationError("Project budget must be greater than zero.")
        return value

    def validate_deadline(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Project deadline cannot be in the past.")
        return value

    def create(self, validated_data):
        skills = validated_data.pop('skills', [])
        project = Project.objects.create(**validated_data)
        if skills:
            project.skills.set(skills)
        return project


class HireFreelancerSerializer(serializers.Serializer):
    """Handles hiring workflow: accepts a bid_id and optional initial milestones."""
    bid_id = serializers.IntegerField(required=True)
