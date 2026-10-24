from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta

from accounts.models import User
from profiles.models import Category, Skill, CustomerProfile, FreelancerProfile
from projects.models import Project, Contract, Milestone
from bids.models import Bid, BidMilestone

class ProjectAndHiringTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Category and Skill
        self.category = Category.objects.create(name="AI & Machine Learning")
        self.skill = Skill.objects.create(name="PyTorch", category=self.category)

        # Customer
        self.customer_user = User.objects.create_user(
            email='customer.client@demo.freelancehub.test',
            password='Password123!',
            first_name='Catherine',
            last_name='Customer',
            role=User.Role.CUSTOMER
        )
        self.customer_profile = self.customer_user.customer_profile
        self.customer_access = str(RefreshToken.for_user(self.customer_user).access_token)

        # Freelancer
        self.freelancer_user = User.objects.create_user(
            email='freelancer.dev@demo.freelancehub.test',
            password='Password123!',
            first_name='Frank',
            last_name='Freelancer',
            role=User.Role.FREELANCER
        )
        self.freelancer_profile = self.freelancer_user.freelancer_profile
        self.freelancer_access = str(RefreshToken.for_user(self.freelancer_user).access_token)

    def test_customer_can_create_project(self):
        """Verify that a customer can create a project with valid budget and deadline."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.customer_access}')
        url = reverse('projects:project_list_create')
        future_date = (timezone.now() + timedelta(days=30)).date().isoformat()
        payload = {
            'title': 'Build High-Scale Recommendation Engine',
            'description': 'Develop a real-time collaborative filtering system using PyTorch and FastAPI.',
            'category': self.category.id,
            'budget': '4500.00',
            'experience_level': 'EXPERT',
            'deadline': future_date,
            'skill_ids': [self.skill.id],
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Project.objects.count(), 1)
        self.assertEqual(float(response.data['budget']), 4500.00)

    def test_project_creation_rejects_past_deadline(self):
        """Verify validation failure when a past deadline is supplied."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.customer_access}')
        url = reverse('projects:project_list_create')
        past_date = (timezone.now() - timedelta(days=5)).date().isoformat()
        payload = {
            'title': 'Invalid Project',
            'description': 'Test past deadline rejection',
            'category': self.category.id,
            'budget': '1000.00',
            'deadline': past_date,
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('deadline', response.data)

    def test_freelancer_cannot_post_project(self):
        """Verify that freelancers are forbidden from posting projects."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access}')
        url = reverse('projects:project_list_create')
        future_date = (timezone.now() + timedelta(days=30)).date().isoformat()
        payload = {
            'title': 'Freelancer Attempt',
            'description': 'Should be rejected',
            'budget': '1000.00',
            'deadline': future_date,
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_project_search_and_filtering(self):
        """Verify faceted filtering by category, experience, and keywords."""
        future_date = (timezone.now() + timedelta(days=20)).date()
        Project.objects.create(
            customer=self.customer_profile,
            title='FastAPI Microservice',
            description='Build low-latency API',
            category=self.category,
            budget=2000.00,
            experience_level='INTERMEDIATE',
            deadline=future_date,
            status=Project.Status.OPEN
        )
        url = reverse('projects:project_list_create')
        res = self.client.get(f"{url}?search=FastAPI&category={self.category.id}&min_budget=1500")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        items = res.data.get('results', res.data)
        self.assertEqual(len(items), 1)

    def test_customer_hiring_workflow(self):
        """Verify customer hiring a freelancer, contract generation, and milestone creation."""
        future_date = (timezone.now() + timedelta(days=20)).date()
        project = Project.objects.create(
            customer=self.customer_profile,
            title='Distributed Cloud Engine',
            description='Build microservices',
            category=self.category,
            budget=5000.00,
            deadline=future_date,
            status=Project.Status.OPEN
        )

        bid = Bid.objects.create(
            project=project,
            freelancer=self.freelancer_profile,
            bid_amount=4800.00,
            delivery_days=25,
            cover_letter='Expert in distributed systems.'
        )
        BidMilestone.objects.create(bid=bid, title='Milestone 1: Prototype', amount=2400.00)
        BidMilestone.objects.create(bid=bid, title='Milestone 2: Final', amount=2400.00)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.customer_access}')
        hire_url = reverse('projects:hire_freelancer', kwargs={'pk': project.id})
        res = self.client.post(hire_url, {'bid_id': bid.id}, format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        project.refresh_from_db()
        bid.refresh_from_db()
        self.assertEqual(project.status, Project.Status.IN_PROGRESS)
        self.assertEqual(bid.status, Bid.Status.ACCEPTED)
        self.assertEqual(Contract.objects.count(), 1)
        self.assertEqual(Milestone.objects.count(), 2)

    def test_milestone_progression_and_approval(self):
        """Verify milestone work submission by freelancer and approval by customer."""
        future_date = (timezone.now() + timedelta(days=20)).date()
        project = Project.objects.create(
            customer=self.customer_profile,
            title='Contract Test Project',
            description='Test',
            budget=1000.00,
            deadline=future_date,
            status=Project.Status.IN_PROGRESS
        )
        contract = Contract.objects.create(
            project=project,
            customer=self.customer_profile,
            freelancer=self.freelancer_profile,
            total_amount=1000.00
        )
        milestone = Milestone.objects.create(
            contract=contract,
            title='Deliverable 1',
            amount=1000.00,
            status=Milestone.Status.FUNDED
        )

        # Freelancer submits deliverable
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access}')
        ms_url = reverse('projects:milestone_status', kwargs={'pk': milestone.id})
        res_sub = self.client.patch(ms_url, {'status': 'SUBMITTED'}, format='json')
        self.assertEqual(res_sub.status_code, status.HTTP_200_OK)
        milestone.refresh_from_db()
        self.assertEqual(milestone.status, Milestone.Status.SUBMITTED)

        # Customer approves deliverable
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.customer_access}')
        res_app = self.client.patch(ms_url, {'status': 'APPROVED'}, format='json')
        self.assertEqual(res_app.status_code, status.HTTP_200_OK)
        milestone.refresh_from_db()
        self.assertEqual(milestone.status, Milestone.Status.APPROVED)

        contract.refresh_from_db()
        self.assertEqual(contract.status, Contract.Status.COMPLETED)
