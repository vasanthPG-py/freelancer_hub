"""
AI Assessment Serializers
Questions for frontend never expose keywords/answers (server-side grading only).
"""
from rest_framework import serializers
from .models import Assessment


class AssessmentStartSerializer(serializers.Serializer):
    """Payload to initiate a new assessment session."""
    # Optional skill focus. If empty, we derive from freelancer profile.
    skill_focus = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True
    )


class AssessmentSubmitSerializer(serializers.Serializer):
    """Payload to submit answers. Keys are question indices (str), values are free-text answers."""
    answers = serializers.DictField(
        child=serializers.CharField(allow_blank=True, max_length=2000),
        allow_empty=True
    )


class AssessmentQuestionSerializer(serializers.Serializer):
    """Safe representation of a single question (no answer key exposed)."""
    id = serializers.IntegerField()
    question_text = serializers.CharField()
    category = serializers.CharField()


class AssessmentDetailSerializer(serializers.ModelSerializer):
    """Full assessment data for the freelancer's own view."""
    questions_for_display = serializers.SerializerMethodField()
    time_remaining_seconds = serializers.IntegerField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Assessment
        fields = [
            'id', 'status', 'score', 'passing_score', 'total_questions',
            'correct_answers', 'duration_minutes', 'started_at',
            'submitted_at', 'expires_at', 'questions_for_display',
            'time_remaining_seconds', 'is_expired', 'ai_generated', 'created_at',
        ]
        read_only_fields = fields

    def get_questions_for_display(self, obj):
        if obj.status in [Assessment.Status.IN_PROGRESS]:
            return obj.get_questions_for_frontend()
        return []


class AssessmentResultSerializer(serializers.ModelSerializer):
    """Result summary returned after grading."""
    passed = serializers.SerializerMethodField()
    grade_label = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            'id', 'status', 'score', 'passing_score', 'total_questions',
            'correct_answers', 'submitted_at', 'ai_generated', 'passed', 'grade_label',
        ]

    def get_passed(self, obj):
        if obj.score is not None:
            return obj.score >= obj.passing_score
        return False

    def get_grade_label(self, obj):
        if obj.score is None:
            return 'Not Graded'
        score = float(obj.score)
        if score >= 90:
            return 'Expert'
        elif score >= 75:
            return 'Advanced'
        elif score >= 60:
            return 'Proficient'
        elif score >= 40:
            return 'Developing'
        else:
            return 'Needs Improvement'


class AssessmentListSerializer(serializers.ModelSerializer):
    """Compact assessment list item."""
    passed = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = ['id', 'status', 'score', 'passing_score', 'created_at', 'submitted_at', 'passed']

    def get_passed(self, obj):
        if obj.score is not None:
            return obj.score >= obj.passing_score
        return False
