"""
Phase 5 — Reviews Tests
Covers: Review creation for completed contracts, duplicate prevention,
        non-participant rejection, public review listing, rating summary.
"""
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal
from datetime import timedelta

from accounts.models import User
from profiles.models import Category, FreelancerProfile, CustomerProfile
from projects.models import Project, Contract, Milestone
from bids.models import Bid
from reviews.models import Review


def make_user(email, role, password='TestPass123!'):
    return User.objects.create_user(
        email=email, password=password, role=role,
        first_name='Review', last_name='Tester'
    )


class ReviewAPITests(APITestCase):
    """Tests for review creation, duplication prevention, and public listing."""

    def setUp(self):
        self.cat = Category.objects.create(name='Test Cat', slug='test-cat-rv', description='', icon='🧪')

        self.cust_user = make_user('cust@rv.test', User.Role.CUSTOMER)
        self.fl_user = make_user('fl@rv.test', User.Role.FREELANCER)
        self.third_user = make_user('third@rv.test', User.Role.CUSTOMER)

        self.cust_profile = CustomerProfile.objects.get(user=self.cust_user)
        self.fl_profile = FreelancerProfile.objects.get(user=self.fl_user)

        # Create a COMPLETED contract
        self.project = Project.objects.create(
            customer=self.cust_profile,
            title='Completed Test Project',
            description='desc',
            category=self.cat,
            budget=Decimal('1000.00'),
            deadline=timezone.now() + timedelta(days=30),
            status=Project.Status.COMPLETED,
        )
        self.bid = Bid.objects.create(
            project=self.project,
            freelancer=self.fl_profile,
            bid_amount=Decimal('1000.00'),
            delivery_days=10,
            cover_letter='I can do it.',
            status=Bid.Status.ACCEPTED,
        )
        self.contract = Contract.objects.create(
            project=self.project,
            customer=self.cust_profile,
            freelancer=self.fl_profile,
            accepted_bid=self.bid,
            total_amount=Decimal('1000.00'),
            status=Contract.Status.COMPLETED,
        )

        # Active contract (not COMPLETED — should block reviews)
        self.active_contract = Contract.objects.create(
            project=Project.objects.create(
                customer=self.cust_profile,
                title='Active Project',
                description='desc',
                category=self.cat,
                budget=Decimal('500.00'),
                deadline=timezone.now() + timedelta(days=30),
                status=Project.Status.IN_PROGRESS,
            ),
            customer=self.cust_profile,
            freelancer=self.fl_profile,
            accepted_bid=self.bid,
            total_amount=Decimal('500.00'),
            status=Contract.Status.ACTIVE,
        )

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def _review_payload(self, contract=None):
        return {
            'contract': (contract or self.contract).id,
            'overall_rating': 5,
            'communication_rating': 5,
            'quality_rating': 5,
            'timeliness_rating': 4,
            'comment': 'Great work, delivered on time!',
        }

    def test_customer_can_review_completed_contract(self):
        self._auth(self.cust_user)
        resp = self.client.post('/api/reviews/', self._review_payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['overall_rating'], 5)

    def test_freelancer_can_review_completed_contract(self):
        self._auth(self.fl_user)
        resp = self.client.post('/api/reviews/', self._review_payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_cannot_review_active_contract(self):
        self._auth(self.cust_user)
        resp = self.client.post('/api/reviews/', self._review_payload(self.active_contract), format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_review_rejected(self):
        self._auth(self.cust_user)
        self.client.post('/api/reviews/', self._review_payload(), format='json')
        resp = self.client.post('/api/reviews/', self._review_payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)

    def test_non_participant_cannot_review(self):
        self._auth(self.third_user)
        resp = self.client.post('/api/reviews/', self._review_payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_rating_out_of_range_rejected(self):
        self._auth(self.cust_user)
        payload = self._review_payload()
        payload['overall_rating'] = 6
        resp = self.client.post('/api/reviews/', payload, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_public_reviews_listing(self):
        # Create a public review first
        Review.objects.create(
            contract=self.contract,
            reviewer=self.cust_user,
            reviewee=self.fl_user,
            direction=Review.ReviewerRole.CUSTOMER_REVIEWING_FREELANCER,
            overall_rating=4,
            communication_rating=4,
            comment='Good job.',
            is_public=True,
        )
        resp = self.client.get(f'/api/reviews/user/{self.fl_user.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data if isinstance(resp.data, list) else resp.data.get('results', resp.data)
        self.assertTrue(len(data) >= 1)

    def test_rating_summary_returns_averages(self):
        Review.objects.create(
            contract=self.contract,
            reviewer=self.cust_user,
            reviewee=self.fl_user,
            direction=Review.ReviewerRole.CUSTOMER_REVIEWING_FREELANCER,
            overall_rating=4,
            communication_rating=5,
            comment='Solid.',
        )
        resp = self.client.get(f'/api/reviews/user/{self.fl_user.id}/summary/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('average_rating', resp.data)
        self.assertIn('total_reviews', resp.data)
        self.assertGreaterEqual(resp.data['total_reviews'], 1)

    def test_unauthenticated_cannot_create_review(self):
        resp = self.client.post('/api/reviews/', self._review_payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
