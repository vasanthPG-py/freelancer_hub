from rest_framework import serializers
from .models import Bid, BidMilestone
from projects.models import Project

class BidMilestoneSerializer(serializers.ModelSerializer):
    """Serializer for proposed milestone deliverables inside a proposal."""
    class Meta:
        model = BidMilestone
        fields = ['id', 'title', 'amount', 'delivery_days']


class BidSerializer(serializers.ModelSerializer):
    """Detailed proposal serializer with freelancer and project summary context."""
    project_title = serializers.ReadOnlyField(source='project.title')
    customer_company = serializers.ReadOnlyField(source='project.customer.company_name')
    freelancer_name = serializers.ReadOnlyField(source='freelancer.user.full_name')
    freelancer_title = serializers.ReadOnlyField(source='freelancer.title')
    freelancer_hourly_rate = serializers.ReadOnlyField(source='freelancer.hourly_rate')
    freelancer_is_verified = serializers.ReadOnlyField(source='freelancer.user.is_verified')
    milestones = BidMilestoneSerializer(many=True, read_only=True)

    class Meta:
        model = Bid
        fields = [
            'id',
            'project',
            'project_title',
            'customer_company',
            'freelancer',
            'freelancer_name',
            'freelancer_title',
            'freelancer_hourly_rate',
            'freelancer_is_verified',
            'bid_amount',
            'delivery_days',
            'cover_letter',
            'status',
            'milestones',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'freelancer', 'status', 'created_at', 'updated_at']


class BidCreateSerializer(serializers.ModelSerializer):
    """Validates proposal creation, preventing self-bidding and duplicate active bids."""
    milestones_data = BidMilestoneSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = Bid
        fields = [
            'id',
            'project',
            'bid_amount',
            'delivery_days',
            'cover_letter',
            'milestones_data',
        ]

    def validate_bid_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Bid amount must be greater than zero.")
        return value

    def validate_delivery_days(self, value):
        if value < 1:
            raise serializers.ValidationError("Delivery timeframe must be at least 1 day.")
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        project = attrs['project']
        freelancer_profile = getattr(request.user, 'freelancer_profile', None)

        if not freelancer_profile:
            raise serializers.ValidationError("You must have an active Freelancer profile to bid on projects.")

        # Business rule 1: Prevent customers from bidding on their own projects
        if project.customer.user == request.user:
            raise serializers.ValidationError("Customers are prohibited from submitting bids on their own projects.")

        # Business rule 2: Project must be in OPEN status
        if project.status != Project.Status.OPEN:
            raise serializers.ValidationError("Bids cannot be submitted to projects that are not open for bidding.")

        # Business rule 3: Prevent duplicate active proposals by the same freelancer
        active_bid_exists = Bid.objects.filter(
            project=project,
            freelancer=freelancer_profile,
            status__in=[Bid.Status.PENDING, Bid.Status.SHORTLISTED]
        ).exists()

        if active_bid_exists:
            raise serializers.ValidationError(
                "You already have an active proposal submitted for this project. Withdraw or edit your existing proposal."
            )

        attrs['freelancer'] = freelancer_profile
        return attrs

    def create(self, validated_data):
        milestones = validated_data.pop('milestones_data', [])
        bid = Bid.objects.create(**validated_data)
        for m in milestones:
            BidMilestone.objects.create(bid=bid, **m)
        return bid
