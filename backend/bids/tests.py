from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta

from accounts.models import User
from profiles.models import Category, CustomerProfile, FreelancerProfile
from projects.models import Project
from bids.models import Bid

class BidAndProposalTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Customer and Project
        self.customer_user = User.objects.create_user(
            email='client.owner@demo.freelancehub.test',
            password='Password123!',
            first_name='Owner',
            last_name='Client',
            role=User.Role.CUSTOMER
        )
        self.customer_profile = self.customer_user.customer_profile
        self.customer_access = str(RefreshToken.for_user(self.customer_user).access_token)

        self.project = Project.objects.create(
            customer=self.customer_profile,
            title='AI Query Chatbot',
            description='Build intelligent query assistant.',
            budget=3000.00,
            deadline=(timezone.now() + timedelta(days=15)).date(),
            status=Project.Status.OPEN
        )

        # Freelancer 1
        self.freelancer_user1 = User.objects.create_user(
            email='freelancer.one@demo.freelancehub.test',
            password='Password123!',
            first_name='One',
            last_name='Dev',
            role=User.Role.FREELANCER
        )
        self.freelancer_profile1 = self.freelancer_user1.freelancer_profile
        self.freelancer_access1 = str(RefreshToken.for_user(self.freelancer_user1).access_token)

        # Freelancer 2
        self.freelancer_user2 = User.objects.create_user(
            email='freelancer.two@demo.freelancehub.test',
            password='Password123!',
            first_name='Two',
            last_name='Dev',
            role=User.Role.FREELANCER
        )
        self.freelancer_profile2 = self.freelancer_user2.freelancer_profile
        self.freelancer_access2 = str(RefreshToken.for_user(self.freelancer_user2).access_token)

    def test_freelancer_can_submit_proposal(self):
        """Verify that a freelancer can submit a proposal with milestones."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access1}')
        url = reverse('bids:bid_create')
        payload = {
            'project': self.project.id,
            'bid_amount': '2800.00',
            'delivery_days': 14,
            'cover_letter': 'I have built similar LLM chatbots with LangChain and FastAPI.',
            'milestones_data': [
                {'title': 'Architecture & API', 'amount': '1400.00', 'delivery_days': 7},
                {'title': 'UI & Integration', 'amount': '1400.00', 'delivery_days': 7},
            ]
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Bid.objects.count(), 1)
        bid = Bid.objects.first()
        self.assertEqual(bid.milestones.count(), 2)

    def test_customer_cannot_bid_on_own_project(self):
        """Verify that a customer cannot submit a bid on their own project."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.customer_access}')
        url = reverse('bids:bid_create')
        payload = {
            'project': self.project.id,
            'bid_amount': '2000.00',
            'delivery_days': 10,
            'cover_letter': 'Attempting self-bidding.',
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_active_bid_prevention(self):
        """Verify that submitting a second active bid by the same freelancer is rejected."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access1}')
        url = reverse('bids:bid_create')
        payload = {
            'project': self.project.id,
            'bid_amount': '2500.00',
            'delivery_days': 12,
            'cover_letter': 'First proposal.',
        }
        res1 = self.client.post(url, payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Attempt second active bid
        res2 = self.client.post(url, payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already have an active proposal", str(res2.data))

    def test_freelancer_can_withdraw_bid(self):
        """Verify that a freelancer can withdraw their active proposal."""
        bid = Bid.objects.create(
            project=self.project,
            freelancer=self.freelancer_profile1,
            bid_amount=2900.00,
            delivery_days=10,
            cover_letter='Will withdraw this soon.'
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access1}')
        withdraw_url = reverse('bids:bid_withdraw', kwargs={'pk': bid.id})
        response = self.client.post(withdraw_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        bid.refresh_from_db()
        self.assertEqual(bid.status, Bid.Status.WITHDRAWN)

    def test_customer_can_shortlist_and_reject_bids(self):
        """Verify that the project owner can shortlist and reject proposals."""
        bid = Bid.objects.create(
            project=self.project,
            freelancer=self.freelancer_profile1,
            bid_amount=2500.00,
            delivery_days=10,
            cover_letter='Proposal to review.'
        )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.customer_access}')
        action_url = reverse('bids:bid_action', kwargs={'pk': bid.id})

        # Shortlist
        res_sl = self.client.post(action_url, {'action': 'SHORTLIST'}, format='json')
        self.assertEqual(res_sl.status_code, status.HTTP_200_OK)
        bid.refresh_from_db()
        self.assertEqual(bid.status, Bid.Status.SHORTLISTED)

        # Reject
        res_rj = self.client.post(action_url, {'action': 'REJECT'}, format='json')
        self.assertEqual(res_rj.status_code, status.HTTP_200_OK)
        bid.refresh_from_db()
        self.assertEqual(bid.status, Bid.Status.REJECTED)
