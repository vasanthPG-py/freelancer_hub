"""
Phase 5 — Messaging & Notification Tests
Covers: Conversation list, message send, start conversation, unread count,
        Notification list, mark-read, mark-all-read.
"""
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from accounts.models import User
from projects.models import Project, Contract
from profiles.models import Category, FreelancerProfile, CustomerProfile
from bids.models import Bid
from messaging.models import Conversation, Message, Notification


def make_user(email, role, password='TestPass123!'):
    u = User.objects.create_user(
        email=email, password=password, role=role,
        first_name='Test', last_name='User'
    )
    return u


class ConversationAPITests(APITestCase):
    """Tests for conversation list, detail, and message send endpoints."""

    def setUp(self):
        self.customer = make_user('cust@test.msg', User.Role.CUSTOMER)
        self.freelancer = make_user('fl@test.msg', User.Role.FREELANCER)
        self.other = make_user('other@test.msg', User.Role.CUSTOMER)

        # Create a conversation
        self.conv = Conversation.objects.create()
        self.conv.participants.add(self.customer, self.freelancer)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_list_conversations_returns_only_own(self):
        """User should only see conversations they participate in."""
        self._auth(self.customer)
        resp = self.client.get('/api/messaging/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Results may be paginated or plain list
        data = resp.data if isinstance(resp.data, list) else resp.data.get('results', resp.data)
        self.assertTrue(len(data) >= 1)

    def test_list_conversations_excludes_non_participants(self):
        self._auth(self.other)
        resp = self.client.get('/api/messaging/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data if isinstance(resp.data, list) else resp.data.get('results', resp.data)
        self.assertEqual(len(data), 0)

    def test_send_message_success(self):
        self._auth(self.customer)
        url = f'/api/messaging/{self.conv.id}/send/'
        resp = self.client.post(url, {'content': 'Hello freelancer!'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['content'], 'Hello freelancer!')

    def test_send_message_non_participant_forbidden(self):
        self._auth(self.other)
        url = f'/api/messaging/{self.conv.id}/send/'
        resp = self.client.post(url, {'content': 'Sneaky!'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_start_conversation_creates_new(self):
        self._auth(self.customer)
        resp = self.client.post('/api/messaging/start/', {
            'user_id': self.freelancer.id,
        }, format='json')
        self.assertIn(resp.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertIn('conversation_id', resp.data)

    def test_start_conversation_idempotent(self):
        """Starting same conversation twice returns same ID."""
        self._auth(self.customer)
        resp1 = self.client.post('/api/messaging/start/', {'user_id': self.freelancer.id}, format='json')
        resp2 = self.client.post('/api/messaging/start/', {'user_id': self.freelancer.id}, format='json')
        self.assertEqual(resp1.data['conversation_id'], resp2.data['conversation_id'])

    def test_unread_count_endpoint(self):
        self._auth(self.customer)
        resp = self.client.get('/api/messaging/unread/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('unread_count', resp.data)

    def test_unauthenticated_rejected(self):
        resp = self.client.get('/api/messaging/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class NotificationAPITests(APITestCase):
    """Tests for Notification list, mark-read, and mark-all-read endpoints."""

    def setUp(self):
        self.user = make_user('notif@test.msg', User.Role.FREELANCER)
        self.other = make_user('other_notif@test.msg', User.Role.CUSTOMER)

        # Create 5 notifications for self.user
        for i in range(5):
            Notification.objects.create(
                user=self.user,
                notification_type=Notification.NotificationType.SYSTEM,
                title=f'Test Notification {i}',
                message=f'Body {i}',
                is_read=(i < 2),  # 2 pre-read, 3 unread
            )
        # One notification for other user (should be invisible)
        Notification.objects.create(
            user=self.other,
            notification_type=Notification.NotificationType.MESSAGE,
            title='Other User Notif',
            message='Should not be visible',
        )

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_list_notifications_own_only(self):
        self._auth(self.user)
        resp = self.client.get('/api/messaging/notifications/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Response shape: {'unread_count': N, 'results': [...]}
        results = resp.data.get('results', [])
        # If results is not a list (i.e. DRF returned raw list in resp.data), handle it:
        if not isinstance(results, list):
            results = []
        self.assertEqual(len(results), 5)
        titles = [n['title'] for n in results]
        self.assertFalse(any('Other User' in t for t in titles))

    def test_unread_count_in_list_response(self):
        self._auth(self.user)
        resp = self.client.get('/api/messaging/notifications/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['unread_count'], 3)

    def test_mark_single_read(self):
        self._auth(self.user)
        notif = Notification.objects.filter(user=self.user, is_read=False).first()
        resp = self.client.post(f'/api/messaging/notifications/{notif.id}/read/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['is_read'])
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)

    def test_mark_other_users_notification_forbidden(self):
        self._auth(self.user)
        other_notif = Notification.objects.get(user=self.other)
        resp = self.client.post(f'/api/messaging/notifications/{other_notif.id}/read/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_all_read(self):
        self._auth(self.user)
        resp = self.client.post('/api/messaging/notifications/read-all/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['marked_read'], 3)
        self.assertEqual(Notification.objects.filter(user=self.user, is_read=False).count(), 0)

    def test_unauthenticated_rejected(self):
        resp = self.client.get('/api/messaging/notifications/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
