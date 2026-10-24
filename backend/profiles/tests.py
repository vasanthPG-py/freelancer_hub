import io
from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from profiles.models import Category, Skill, FreelancerProfile, CustomerProfile, Portfolio, Resume

class ProfileSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Category & Skills
        self.category = Category.objects.create(
            name="Full-Stack Web Development",
            description="Web frameworks, APIs, and modern frontend"
        )
        self.skill_python = Skill.objects.create(name="Python", category=self.category)
        self.skill_react = Skill.objects.create(name="React", category=self.category)
        self.skill_postgres = Skill.objects.create(name="PostgreSQL", category=self.category)

        # Create Freelancer User
        self.freelancer_user = User.objects.create_user(
            email='freelancer.test@demo.freelancehub.test',
            password='TestPassword123!',
            first_name='Dev',
            last_name='Tester',
            role=User.Role.FREELANCER,
        )
        self.freelancer_refresh = RefreshToken.for_user(self.freelancer_user)
        self.freelancer_access = str(self.freelancer_refresh.access_token)

        # Create Customer User
        self.customer_user = User.objects.create_user(
            email='customer.test@demo.freelancehub.test',
            password='TestPassword123!',
            first_name='Client',
            last_name='Tester',
            role=User.Role.CUSTOMER,
        )
        self.customer_refresh = RefreshToken.for_user(self.customer_user)
        self.customer_access = str(self.customer_refresh.access_token)

    def test_signals_automatically_provision_profiles(self):
        """Verify that user creation automatically creates corresponding profile records."""
        self.assertTrue(FreelancerProfile.objects.filter(user=self.freelancer_user).exists())
        self.assertTrue(CustomerProfile.objects.filter(user=self.customer_user).exists())

    def test_categories_and_skills_endpoints_are_public(self):
        """Verify that categories and skills list endpoints are publicly accessible."""
        cat_url = reverse('profiles:category_list')
        cat_res = self.client.get(cat_url)
        self.assertEqual(cat_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(cat_res.data), 1)

        skill_url = reverse('profiles:skill_list')
        skill_res = self.client.get(skill_url)
        self.assertEqual(skill_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(skill_res.data), 3)

    def test_freelancer_can_update_profile(self):
        """Verify that a freelancer can update their title, bio, hourly rate, and skills."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access}')
        url = reverse('profiles:freelancer_profile')
        payload = {
            'title': 'Senior Full-Stack Architect',
            'bio': 'Over 8 years crafting high-scale Python and React platforms.',
            'hourly_rate': '85.00',
            'experience_level': 'EXPERT',
            'location': 'Seattle, WA',
            'skill_ids': [self.skill_python.id, self.skill_react.id],
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Senior Full-Stack Architect')
        self.assertEqual(float(response.data['hourly_rate']), 85.00)
        self.assertEqual(len(response.data['skills_data']), 2)

    def test_customer_cannot_update_freelancer_profile(self):
        """Verify that a customer cannot access or modify the freelancer profile endpoint."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.customer_access}')
        url = reverse('profiles:freelancer_profile')
        response = self.client.patch(url, {'title': 'Hacker'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_can_update_company_profile(self):
        """Verify that a customer can update their business profile."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.customer_access}')
        url = reverse('profiles:customer_profile')
        payload = {
            'company_name': 'Quantum Logic Technologies',
            'company_bio': 'Building next-generation distributed systems.',
            'website': 'https://quantumlogic.test',
            'location': 'San Francisco, CA',
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['company_name'], 'Quantum Logic Technologies')

    def test_resume_upload_valid_file(self):
        """Verify successful resume upload with text extraction."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access}')
        url = reverse('profiles:resume_upload')
        resume_content = b"Senior Engineer with expertise in Python, Django, PostgreSQL, and React."
        file = SimpleUploadedFile("resume.txt", resume_content, content_type="text/plain")

        response = self.client.post(url, {'file': file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('resume', response.data)
        self.assertEqual(response.data['resume']['original_name'], 'resume.txt')

        # Check extracted text updated on profile
        profile = self.freelancer_user.freelancer_profile
        profile.refresh_from_db()
        self.assertIn("Python, Django", profile.resume_text)

    def test_resume_upload_rejects_invalid_extension(self):
        """Verify that unsupported extensions (e.g., .exe) are rejected."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access}')
        url = reverse('profiles:resume_upload')
        malicious_file = SimpleUploadedFile("script.exe", b"binary_code", content_type="application/octet-stream")

        response = self.client.post(url, {'file': malicious_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resume_upload_rejects_oversized_file(self):
        """Verify that files exceeding 5MB are rejected."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access}')
        url = reverse('profiles:resume_upload')
        oversized_content = b"x" * (6 * 1024 * 1024) # 6MB
        big_file = SimpleUploadedFile("huge_resume.pdf", oversized_content, content_type="application/pdf")

        response = self.client.post(url, {'file': big_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_portfolio_crud_lifecycle(self):
        """Verify that a freelancer can create, list, and delete portfolio items."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.freelancer_access}')
        list_url = reverse('profiles:portfolio_list_create')

        # Create
        create_payload = {
            'title': 'Autonomous Analytics Dashboard',
            'description': 'Real-time metrics aggregator with React, Django REST, and WebSocket feeds.',
            'project_url': 'https://demo.analytics.test',
            'skill_ids': [self.skill_python.id, self.skill_react.id],
        }
        res_create = self.client.post(list_url, create_payload, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        item_id = res_create.data['id']

        # List
        res_list = self.client.get(list_url)
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        items = res_list.data.get('results', res_list.data)
        self.assertEqual(len(items), 1)

        # Delete
        detail_url = reverse('profiles:portfolio_detail', kwargs={'pk': item_id})
        res_del = self.client.delete(detail_url)
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Portfolio.objects.count(), 0)
