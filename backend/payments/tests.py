from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from profiles.models import CustomerProfile, FreelancerProfile, Category
from projects.models import Project, Contract, Milestone
from payments.models import Transaction


class PaymentAPITests(APITestCase):
    def setUp(self):
        self.customer_user = User.objects.create_user(
            email='cust_pay@test.local',
            password='TestPass123!',
            role=User.Role.CUSTOMER,
            first_name='Customer',
            last_name='Pay'
        )
        self.freelancer_user = User.objects.create_user(
            email='free_pay@test.local',
            password='TestPass123!',
            role=User.Role.FREELANCER,
            first_name='Freelancer',
            last_name='Pay'
        )

        self.customer_profile = self.customer_user.customer_profile
        self.customer_profile.company_name = 'Pay Test Inc'
        self.customer_profile.save()

        self.freelancer_profile = self.freelancer_user.freelancer_profile
        self.freelancer_profile.hourly_rate = Decimal('65.00')
        self.freelancer_profile.save()
        self.category = Category.objects.create(name='Dev', slug='dev')

        self.project = Project.objects.create(
            customer=self.customer_profile,
            category=self.category,
            title='Payment Test Project',
            description='Test Desc',
            budget=Decimal('2000.00'),
            deadline='2026-12-31'
        )
        self.contract = Contract.objects.create(
            project=self.project,
            customer=self.customer_profile,
            freelancer=self.freelancer_profile,
            total_amount=Decimal('2000.00'),
            status=Contract.Status.ACTIVE
        )
        self.milestone = Milestone.objects.create(
            contract=self.contract,
            title='Milestone 1',
            amount=Decimal('1000.00'),
            status=Milestone.Status.SUBMITTED
        )

    def test_simulate_payment_by_customer(self):
        self.client.force_authenticate(user=self.customer_user)
        payload = {
            'contract_id': self.contract.id,
            'milestone_id': self.milestone.id,
            'amount': '1000.00',
            'transaction_type': Transaction.TransactionType.MILESTONE_RELEASE,
            'note': 'Test release'
        }
        url = reverse('payments:simulate-payment')
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['transaction']['is_simulated'])
        self.assertEqual(response.data['transaction']['amount'], '1000.00')

        self.milestone.refresh_from_db()
        self.assertEqual(self.milestone.status, Milestone.Status.APPROVED)

    def test_freelancer_cannot_simulate_payout_to_themselves(self):
        self.client.force_authenticate(user=self.freelancer_user)
        payload = {
            'contract_id': self.contract.id,
            'milestone_id': self.milestone.id,
            'amount': '1000.00',
            'transaction_type': Transaction.TransactionType.MILESTONE_RELEASE,
        }
        url = reverse('payments:simulate-payment')
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_transactions(self):
        Transaction.objects.create(
            contract=self.contract,
            milestone=self.milestone,
            payer=self.customer_user,
            recipient=self.freelancer_user,
            amount=Decimal('500.00'),
            transaction_type=Transaction.TransactionType.MILESTONE_RELEASE
        )
        self.client.force_authenticate(user=self.customer_user)
        url = reverse('payments:transaction-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
