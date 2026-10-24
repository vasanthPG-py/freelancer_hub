import json
from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from profiles.models import Category, Skill, FreelancerProfile, CustomerProfile
from assessments.models import Assessment, FALLBACK_QUESTIONS

class AIAssessmentTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Category and Skills
        self.category = Category.objects.create(name="Full-Stack Web Development")
        self.skill_python = Skill.objects.create(name="Python", category=self.category)
        self.skill_django = Skill.objects.create(name="Django", category=self.category)

        # Freelancer User
        self.freelancer_user = User.objects.create_user(
            email='fl.assess@demo.freelancehub.test',
            password='Password123!',
            first_name='Assessment',
            last_name='Tester',
            role=User.Role.FREELANCER,
        )
        self.freelancer_profile = self.freelancer_user.freelancer_profile
        self.freelancer_profile.skills.add(self.skill_python, self.skill_django)
        self.freelancer_access = str(RefreshToken.for_user(self.freelancer_user).access_token)

        # Customer User
        self.customer_user = User.objects.create_user(
            email='client.assess@demo.freelancehub.test',
            password='Password123!',
            first_name='Client',
            last_name='Tester',
            role=User.Role.CUSTOMER,
        )
        self.customer_access = str(RefreshToken.for_user(self.customer_user).access_token)

    def test_assessment_start_freelancer_success(self):
        """Verify that a freelancer can start an assessment and questions exclude answer keys."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access}')
        url = reverse('assessment-start')
        response = self.client.post(url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('assessment', response.data)
        assessment_data = response.data['assessment']
        self.assertEqual(assessment_data['status'], Assessment.Status.IN_PROGRESS)
        self.assertEqual(len(assessment_data['questions_for_display']), 10)

        # Invariant check: Answer keys/keywords are NEVER sent to the client
        for q in assessment_data['questions_for_display']:
            self.assertNotIn('keywords', q)
            self.assertNotIn('answer', q)
            self.assertIn('question_text', q)
            self.assertIn('category', q)

    def test_customer_cannot_start_assessment(self):
        """Verify that customers are forbidden from taking technical assessments."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.customer_access}')
        url = reverse('assessment-start')
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_prevent_multiple_concurrent_assessments(self):
        """Verify that a freelancer cannot have multiple concurrent in-progress assessments."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access}')
        url = reverse('assessment-start')
        # Start first
        res1 = self.client.post(url, {}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Attempt second active session
        res2 = self.client.post(url, {}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_409_CONFLICT)

    def test_server_side_grading_passing_score_verifies_freelancer(self):
        """Verify server-side keyword grading marks freelancer as verified on passing score."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access}')
        start_url = reverse('assessment-start')
        start_res = self.client.post(start_url, {}, format='json')
        assessment_id = start_res.data['assessment']['id']

        assessment = Assessment.objects.get(pk=assessment_id)
        # Construct answers containing required keywords for all questions
        answers = {}
        for idx, q in enumerate(assessment.questions):
            keywords = q.get('keywords', ['python'])
            answers[str(idx)] = f"This concept involves {' '.join(keywords)} to optimize code execution."

        submit_url = reverse('assessment-submit', kwargs={'pk': assessment_id})
        submit_res = self.client.post(submit_url, {'answers': answers}, format='json')

        self.assertEqual(submit_res.status_code, status.HTTP_200_OK)
        result = submit_res.data['result']
        self.assertGreaterEqual(float(result['score']), 60.0)
        self.assertTrue(result['passed'])

        # Verify user model is_verified flag is set to True
        self.freelancer_user.refresh_from_db()
        self.assertTrue(self.freelancer_user.is_verified)

    def test_server_side_grading_failing_score_keeps_unverified(self):
        """Verify that failing the assessment does not mark the freelancer verified."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access}')
        start_url = reverse('assessment-start')
        start_res = self.client.post(start_url, {}, format='json')
        assessment_id = start_res.data['assessment']['id']

        # Blank/wrong answers
        answers = {str(i): "I don't know the answer." for i in range(10)}

        submit_url = reverse('assessment-submit', kwargs={'pk': assessment_id})
        submit_res = self.client.post(submit_url, {'answers': answers}, format='json')

        self.assertEqual(submit_res.status_code, status.HTTP_200_OK)
        result = submit_res.data['result']
        self.assertLess(float(result['score']), 60.0)
        self.assertFalse(result['passed'])

        self.freelancer_user.refresh_from_db()
        self.assertFalse(self.freelancer_user.is_verified)

    def test_expired_assessment_submission_rejected(self):
        """Verify that submissions past the expiration time are rejected."""
        assessment = Assessment.objects.create(
            freelancer=self.freelancer_profile,
            status=Assessment.Status.IN_PROGRESS,
            questions=[{'q': 'Sample?', 'keywords': ['sample']}],
            total_questions=1,
            duration_minutes=30,
            started_at=timezone.now() - timedelta(minutes=45),
            expires_at=timezone.now() - timedelta(minutes=15),
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access}')
        submit_url = reverse('assessment-submit', kwargs={'pk': assessment.id})
        submit_res = self.client.post(submit_url, {'answers': {'0': 'sample'}}, format='json')

        self.assertEqual(submit_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", submit_res.data['error'])
        assessment.refresh_from_db()
        self.assertEqual(assessment.status, Assessment.Status.EXPIRED)

    def test_fallback_questions_bank_contains_at_least_10_per_category(self):
        """Verify predefined fallback question bank has at least 10 questions for core technical categories."""
        self.assertGreaterEqual(len(FALLBACK_QUESTIONS.get('python', [])), 10)
        self.assertGreaterEqual(len(FALLBACK_QUESTIONS.get('javascript', [])), 10)
        self.assertGreaterEqual(len(FALLBACK_QUESTIONS.get('react', [])), 10)
        self.assertGreaterEqual(len(FALLBACK_QUESTIONS.get('django', [])), 10)
