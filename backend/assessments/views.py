"""
AI Assessment Views
- Start: generate questions server-side, store with answer keys, send only prompts to client
- Submit: grade answers server-side, update freelancer verification status
- History: list past assessments for the freelancer
"""
import random
import os
from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Assessment, FALLBACK_QUESTIONS
from .serializers import (
    AssessmentStartSerializer,
    AssessmentSubmitSerializer,
    AssessmentDetailSerializer,
    AssessmentResultSerializer,
    AssessmentListSerializer,
)
from profiles.models import FreelancerProfile


def _build_questions_from_skills(skills, count=10):
    """
    Attempt AI generation first; fall back to curated question bank.
    Returns list of question dicts with embedded answer keywords (server-side only).
    """
    skill_names = [s.name.lower() for s in skills]

    # Map skill names to question bank categories
    category_map = {
        'python': 'python',
        'django': 'django',
        'javascript': 'javascript',
        'react': 'react',
        'reactjs': 'react',
        'react.js': 'react',
        'typescript': 'javascript',
        'node.js': 'javascript',
        'nodejs': 'javascript',
    }

    # Determine which categories to pull from
    selected_categories = set()
    for skill in skill_names:
        for key, cat in category_map.items():
            if key in skill:
                selected_categories.add(cat)
                break

    if not selected_categories:
        selected_categories = {'general'}

    # Collect and shuffle questions from matching categories
    pool = []
    for cat in selected_categories:
        questions = FALLBACK_QUESTIONS.get(cat, [])
        for q in questions:
            pool.append({**q, 'category': cat})

    # Always add some general questions
    for q in FALLBACK_QUESTIONS.get('general', []):
        pool.append({**q, 'category': 'general'})

    random.shuffle(pool)

    # Try AI generation via Gemini if API key is set
    ai_generated = False
    ai_api_key = os.getenv('AI_API_KEY', '')
    if ai_api_key:
        try:
            import requests
            skill_list_str = ', '.join(skill_names[:5]) or 'full-stack development'
            prompt = f"""Generate {count} technical interview questions for a freelancer with skills in: {skill_list_str}.
For each question, provide:
- A challenging open-ended technical question
- 5 keywords that a correct answer would contain

Return ONLY valid JSON array:
[{{"question_text": "...", "keywords": ["kw1","kw2","kw3","kw4","kw5"], "category": "skill_name"}}]

Requirements:
- Questions must be specific and technical (not generic)
- Vary difficulty (2 easy, 5 medium, 3 hard)
- Focus on practical application and problem-solving"""

            resp = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={ai_api_key}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=15
            )
            if resp.status_code == 200:
                content = resp.json()
                text = content['candidates'][0]['content']['parts'][0]['text']
                # Extract JSON from markdown code block if needed
                import re
                json_match = re.search(r'\[.*\]', text, re.DOTALL)
                if json_match:
                    import json
                    ai_questions = json.loads(json_match.group())
                    if isinstance(ai_questions, list) and len(ai_questions) >= count:
                        formatted = []
                        for aq in ai_questions[:count]:
                            formatted.append({
                                'q': aq.get('question_text', ''),
                                'keywords': aq.get('keywords', []),
                                'category': aq.get('category', 'general'),
                            })
                        ai_generated = True
                        return formatted, True
        except Exception:
            pass  # Fall through to fallback bank

    selected = pool[:count]
    if len(selected) < count:
        # Pad with general questions if pool is small
        for q in FALLBACK_QUESTIONS.get('general', []):
            if len(selected) >= count:
                break
            if q not in selected:
                selected.append({**q, 'category': 'general'})

    return selected[:count], False


class AssessmentStartAPIView(APIView):
    """
    POST /api/assessments/start/
    Generates a timed assessment session with server-stored question + answer keys.
    Only question prompts (no answers) are returned to the client.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        profile = getattr(user, 'freelancer_profile', None)
        if not profile:
            return Response(
                {'error': 'Only freelancer accounts can take skill assessments.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Prevent multiple active sessions
        active = Assessment.objects.filter(
            freelancer=profile,
            status=Assessment.Status.IN_PROGRESS
        ).first()
        if active:
            if active.is_expired:
                active.status = Assessment.Status.EXPIRED
                active.save(update_fields=['status'])
            else:
                serializer = AssessmentDetailSerializer(active)
                return Response(
                    {'error': 'You already have an active assessment session.', 'assessment': serializer.data},
                    status=status.HTTP_409_CONFLICT
                )

        serializer = AssessmentStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        skills = profile.skills.all()
        questions, ai_generated = _build_questions_from_skills(skills, count=10)

        now = timezone.now()
        assessment = Assessment.objects.create(
            freelancer=profile,
            status=Assessment.Status.IN_PROGRESS,
            questions=questions,
            total_questions=len(questions),
            duration_minutes=30,
            started_at=now,
            expires_at=now + timedelta(minutes=30),
            ai_generated=ai_generated,
        )
        assessment.assessed_skills.set(skills)

        return Response({
            'message': 'Assessment started. You have 30 minutes to complete all questions.',
            'assessment': AssessmentDetailSerializer(assessment).data,
        }, status=status.HTTP_201_CREATED)


class AssessmentSubmitAPIView(APIView):
    """
    POST /api/assessments/<pk>/submit/
    Server grades the submitted answers. Score and pass/fail status computed here.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        profile = getattr(request.user, 'freelancer_profile', None)
        if not profile:
            return Response({'error': 'Freelancer account required.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            assessment = Assessment.objects.get(pk=pk, freelancer=profile)
        except Assessment.DoesNotExist:
            return Response({'error': 'Assessment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if assessment.status != Assessment.Status.IN_PROGRESS:
            return Response({'error': f'Assessment is in {assessment.status} state and cannot be submitted.'}, status=status.HTTP_400_BAD_REQUEST)

        if assessment.is_expired:
            assessment.status = Assessment.Status.EXPIRED
            assessment.save(update_fields=['status'])
            return Response({'error': 'Assessment session has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        submit_serializer = AssessmentSubmitSerializer(data=request.data)
        submit_serializer.is_valid(raise_exception=True)

        assessment.answers = submit_serializer.validated_data['answers']
        assessment.status = Assessment.Status.SUBMITTED
        assessment.save()

        # Grade server-side
        score = assessment.grade()

        return Response({
            'message': 'Assessment submitted and graded successfully.',
            'result': AssessmentResultSerializer(assessment).data,
        }, status=status.HTTP_200_OK)


class AssessmentDetailAPIView(generics.RetrieveAPIView):
    """
    GET /api/assessments/<pk>/
    Returns assessment detail for the owning freelancer (questions without answers).
    """
    serializer_class = AssessmentDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile = getattr(self.request.user, 'freelancer_profile', None)
        if not profile:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Freelancer account required.')
        return Assessment.objects.get(pk=self.kwargs['pk'], freelancer=profile)


class AssessmentHistoryAPIView(generics.ListAPIView):
    """
    GET /api/assessments/history/
    Lists all past assessment sessions for the authenticated freelancer.
    """
    serializer_class = AssessmentListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        profile = getattr(self.request.user, 'freelancer_profile', None)
        if not profile:
            return Assessment.objects.none()
        return Assessment.objects.filter(freelancer=profile).order_by('-created_at')


class ActiveAssessmentAPIView(APIView):
    """
    GET /api/assessments/active/
    Returns the currently active (in-progress) assessment if one exists.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, 'freelancer_profile', None)
        if not profile:
            return Response({'assessment': None})

        active = Assessment.objects.filter(
            freelancer=profile,
            status=Assessment.Status.IN_PROGRESS
        ).first()

        if not active:
            return Response({'assessment': None})

        if active.is_expired:
            active.status = Assessment.Status.EXPIRED
            active.save(update_fields=['status'])
            return Response({'assessment': None, 'message': 'Previous session expired.'})

        return Response({'assessment': AssessmentDetailSerializer(active).data})
