from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from accounts.models import User
from datetime import timedelta
import time

class AuthenticationAndAccountTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer_data = {
            'email': 'customer.alice@demo.freelancehub.test',
            'first_name': 'Alice',
            'last_name': 'Johnson',
            'role': User.Role.CUSTOMER,
            'phone_number': '+1-555-0101',
            'password': 'StrongPassword123!',
            'password_confirm': 'StrongPassword123!',
        }
        self.freelancer_data = {
            'email': 'freelancer.bob@demo.freelancehub.test',
            'first_name': 'Bob',
            'last_name': 'Smith',
            'role': User.Role.FREELANCER,
            'phone_number': '+1-555-0102',
            'password': 'StrongPassword123!',
            'password_confirm': 'StrongPassword123!',
        }

    def test_customer_registration_success(self):
        """Verify successful registration of a customer account."""
        url = reverse('accounts:register')
        response = self.client.post(url, self.customer_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['role'], User.Role.CUSTOMER)
        self.assertEqual(User.objects.count(), 1)

    def test_freelancer_registration_success(self):
        """Verify successful registration of a freelancer account."""
        url = reverse('accounts:register')
        response = self.client.post(url, self.freelancer_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['role'], User.Role.FREELANCER)

    def test_registration_password_mismatch(self):
        """Verify registration failure when password and password_confirm do not match."""
        url = reverse('accounts:register')
        invalid_data = self.customer_data.copy()
        invalid_data['password_confirm'] = 'DifferentPassword123!'
        response = self.client.post(url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data['errors'])

    def test_duplicate_email_registration_fails(self):
        """Verify that duplicate email registration is rejected."""
        url = reverse('accounts:register')
        self.client.post(url, self.customer_data, format='json')
        duplicate_response = self.client.post(url, self.customer_data, format='json')
        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_flow_and_jwt_issuance(self):
        """Verify that login authenticates correctly and returns JWT tokens."""
        User.objects.create_user(
            email='alice@example.com',
            password='Password123!',
            first_name='Alice',
            last_name='Tester',
            role=User.Role.CUSTOMER
        )
        url = reverse('accounts:login')
        login_payload = {'email': 'alice@example.com', 'password': 'Password123!'}
        response = self.client.post(url, login_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data['tokens'])
        self.assertIn('refresh', response.data['tokens'])
        self.assertEqual(response.data['user']['email'], 'alice@example.com')

    def test_login_with_invalid_credentials_fails(self):
        """Verify that login with incorrect password fails with 401."""
        User.objects.create_user(
            email='alice@example.com',
            password='Password123!',
            first_name='Alice',
            last_name='Tester',
            role=User.Role.CUSTOMER
        )
        url = reverse('accounts:login')
        response = self.client.post(url, {'email': 'alice@example.com', 'password': 'WrongPassword!'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_flow(self):
        """Verify that a valid refresh token generates a new access token."""
        user = User.objects.create_user(
            email='charlie@example.com',
            password='Password123!',
            first_name='Charlie',
            last_name='Brown',
            role=User.Role.FREELANCER
        )
        refresh = RefreshToken.for_user(user)
        url = reverse('accounts:token_refresh')
        response = self.client.post(url, {'refresh': str(refresh)}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_logout_blacklists_refresh_token(self):
        """Verify that logging out blacklists the refresh token."""
        user = User.objects.create_user(
            email='david@example.com',
            password='Password123!',
            first_name='David',
            last_name='Miller',
            role=User.Role.FREELANCER
        )
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        logout_url = reverse('accounts:logout')
        logout_res = self.client.post(logout_url, {'refresh': str(refresh)}, format='json')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # Trying to refresh with the blacklisted token must fail
        refresh_url = reverse('accounts:token_refresh')
        retry_res = self.client.post(refresh_url, {'refresh': str(refresh)}, format='json')
        self.assertEqual(retry_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_route_unauthenticated_access_denied(self):
        """Verify that unauthenticated requests to protected endpoints return 401."""
        url = reverse('accounts:current_user')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_protected_route_with_valid_token(self):
        """Verify that authenticated requests to protected endpoints succeed."""
        user = User.objects.create_user(
            email='eva@example.com',
            password='Password123!',
            first_name='Eva',
            last_name='Green',
            role=User.Role.FREELANCER
        )
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        url = reverse('accounts:current_user')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'eva@example.com')

    def test_password_reset_request_and_confirmation(self):
        """Verify complete password reset cycle."""
        user = User.objects.create_user(
            email='resetme@example.com',
            password='InitialPassword123!',
            first_name='Reset',
            last_name='User',
            role=User.Role.CUSTOMER
        )
        req_url = reverse('accounts:password_reset_request')
        req_res = self.client.post(req_url, {'email': 'resetme@example.com'}, format='json')
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)
        self.assertIn('token', req_res.data)
        self.assertIn('uidb64', req_res.data)

        # Confirm reset
        confirm_url = reverse('accounts:password_reset_confirm')
        confirm_payload = {
            'uidb64': req_res.data['uidb64'],
            'token': req_res.data['token'],
            'new_password': 'BrandNewPassword456!',
            'new_password_confirm': 'BrandNewPassword456!',
        }
        confirm_res = self.client.post(confirm_url, confirm_payload, format='json')
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        # Login with old password must fail
        login_url = reverse('accounts:login')
        fail_login = self.client.post(login_url, {'email': 'resetme@example.com', 'password': 'InitialPassword123!'}, format='json')
        self.assertEqual(fail_login.status_code, status.HTTP_401_UNAUTHORIZED)

        # Login with new password must succeed
        ok_login = self.client.post(login_url, {'email': 'resetme@example.com', 'password': 'BrandNewPassword456!'}, format='json')
        self.assertEqual(ok_login.status_code, status.HTTP_200_OK)


class SeedDemoCommandTests(TestCase):
    def test_seed_demo_command_creates_at_least_10_records_per_dataset(self):
        """
        Verify that running seed_demo populates >= 10 records for all datasets
        including Phase 5: Conversations, Messages, Reviews, Notifications.
        """
        from django.core.management import call_command
        from profiles.models import Category, Skill, CustomerProfile, FreelancerProfile, Portfolio, Resume
        from projects.models import Project, Contract, Milestone
        from bids.models import Bid
        from assessments.models import Assessment
        from messaging.models import Conversation, Message, Notification
        from reviews.models import Review
        from payments.models import Transaction

        # Execute seed_demo with reset flag
        call_command('seed_demo', reset=True)

        # Phase 1 & 2 — Users, Profiles
        self.assertGreaterEqual(Category.objects.count(), 10)
        self.assertGreaterEqual(Skill.objects.count(), 10)
        self.assertGreaterEqual(
            CustomerProfile.objects.filter(user__email__endswith='@demo.freelancehub.test').count(),
            10
        )
        self.assertGreaterEqual(
            FreelancerProfile.objects.filter(user__email__endswith='@demo.freelancehub.test').count(),
            10
        )
        self.assertGreaterEqual(Resume.objects.count(), 10)
        self.assertGreaterEqual(Portfolio.objects.count(), 10)

        # Phase 3 — Projects, Bids, Contracts
        self.assertGreaterEqual(Project.objects.filter(status=Project.Status.OPEN).count(), 10)
        self.assertGreaterEqual(Bid.objects.count(), 10)
        self.assertGreaterEqual(Contract.objects.count(), 10)
        self.assertGreaterEqual(Milestone.objects.count(), 10)

        # Phase 4 — Assessments
        self.assertGreaterEqual(Assessment.objects.count(), 10)

        # Phase 5 — Messaging, Reviews, Notifications
        self.assertGreaterEqual(Conversation.objects.count(), 10,
                                "Expected >= 10 seeded Conversations")
        self.assertGreaterEqual(Message.objects.count(), 10,
                                "Expected >= 10 seeded Messages (3 per conversation * 10 = 30)")
        self.assertGreaterEqual(Review.objects.count(), 8,
                                "Expected >= 8 seeded Reviews (2 per completed contract, 4 completed = 8)")
        self.assertGreaterEqual(Notification.objects.count(), 10,
                                "Expected >= 10 seeded Notifications")

        # Phase 6 — Simulated Transactions
        self.assertGreaterEqual(Transaction.objects.count(), 10,
                                "Expected >= 10 seeded Simulated Transactions")

        # Confirm repeatability without errors
        call_command('seed_demo')
        self.assertGreaterEqual(CustomerProfile.objects.count(), 10)

