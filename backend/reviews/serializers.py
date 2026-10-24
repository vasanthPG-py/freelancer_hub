from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    reviewer_role = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'contract', 'reviewer', 'reviewer_name', 'reviewer_role',
            'reviewee', 'direction', 'overall_rating', 'communication_rating',
            'quality_rating', 'timeliness_rating', 'comment', 'is_public', 'created_at',
        ]
        read_only_fields = ['id', 'reviewer', 'reviewer_name', 'reviewer_role', 'reviewee', 'direction', 'created_at']

    def get_reviewer_name(self, obj):
        return obj.reviewer.full_name or obj.reviewer.email

    def get_reviewer_role(self, obj):
        return obj.reviewer.role


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = [
            'contract', 'overall_rating', 'communication_rating',
            'quality_rating', 'timeliness_rating', 'comment',
        ]

    def validate_overall_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value
