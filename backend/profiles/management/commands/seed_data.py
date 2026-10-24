"""
Management command to seed the database with sample data for development and testing.
Creates categories, skills, sample users (customer + freelancer), and sample projects.
"""
import random
from decimal import Decimal
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User
from profiles.models import Category, Skill, FreelancerProfile, CustomerProfile, Portfolio
from projects.models import Project


CATEGORIES = [
    {'name': 'Web Development', 'icon': '🌐', 'description': 'Full-stack web applications, websites, and web services.'},
    {'name': 'Mobile Development', 'icon': '📱', 'description': 'iOS, Android, and cross-platform mobile apps.'},
    {'name': 'AI & Machine Learning', 'icon': '🤖', 'description': 'ML models, NLP, computer vision, and AI integrations.'},
    {'name': 'Data Science', 'icon': '📊', 'description': 'Data analysis, visualization, and business intelligence.'},
    {'name': 'DevOps & Cloud', 'icon': '☁️', 'description': 'CI/CD pipelines, infrastructure, and cloud architecture.'},
    {'name': 'UI/UX Design', 'icon': '🎨', 'description': 'User interface design, prototyping, and user research.'},
    {'name': 'Blockchain', 'icon': '⛓️', 'description': 'Smart contracts, DeFi, and Web3 applications.'},
    {'name': 'Cybersecurity', 'icon': '🔒', 'description': 'Penetration testing, security audits, and vulnerability assessment.'},
    {'name': 'Backend Development', 'icon': '⚙️', 'description': 'APIs, microservices, databases, and server-side logic.'},
    {'name': 'Data Engineering', 'icon': '🔧', 'description': 'ETL pipelines, data warehouses, and streaming systems.'},
]

SKILLS_BY_CATEGORY = {
    'Web Development': ['React', 'Vue.js', 'Angular', 'Next.js', 'TypeScript', 'JavaScript', 'HTML/CSS', 'Tailwind CSS', 'GraphQL'],
    'Mobile Development': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Ionic', 'Expo'],
    'AI & Machine Learning': ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'OpenAI API', 'LangChain', 'Hugging Face', 'NLP'],
    'Data Science': ['Pandas', 'NumPy', 'Matplotlib', 'Seaborn', 'Jupyter', 'R', 'Tableau', 'Power BI'],
    'DevOps & Cloud': ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'GitHub Actions', 'Jenkins', 'Linux'],
    'UI/UX Design': ['Figma', 'Sketch', 'Adobe XD', 'Illustrator', 'Prototyping', 'Wireframing', 'User Research'],
    'Blockchain': ['Solidity', 'Ethereum', 'Web3.js', 'Hardhat', 'NFT', 'DeFi', 'Rust', 'Near Protocol'],
    'Cybersecurity': ['Penetration Testing', 'Burp Suite', 'Nmap', 'OWASP', 'Network Security', 'Ethical Hacking'],
    'Backend Development': ['Python', 'Django', 'Node.js', 'FastAPI', 'PostgreSQL', 'Redis', 'Celery', 'REST API', 'Java', 'Go'],
    'Data Engineering': ['Apache Spark', 'Apache Kafka', 'dbt', 'Airflow', 'BigQuery', 'Snowflake', 'ETL', 'PySpark'],
}

SAMPLE_PROJECTS = [
    {
        'title': 'AI-Powered E-Commerce Recommendation Engine',
        'description': 'We need a senior ML engineer to build a product recommendation system using collaborative filtering and transformer-based models. The system should integrate with our existing Django backend and PostgreSQL database. Must handle 100k+ product catalog and 500k daily active users. Deliverables: trained model, REST API endpoint, A/B testing framework, and performance report.',
        'budget': Decimal('8500.00'),
        'experience_level': 'EXPERT',
        'category': 'AI & Machine Learning',
        'skills': ['Python', 'TensorFlow', 'Django', 'PostgreSQL', 'REST API'],
        'days_until_deadline': 45,
    },
    {
        'title': 'Full-Stack SaaS Dashboard with React & Django',
        'description': 'Build a complete SaaS analytics dashboard. Frontend: React 18, TypeScript, Chart.js, responsive design. Backend: Django REST Framework, JWT authentication, multi-tenant architecture, Celery for async tasks. Database: PostgreSQL with proper indexing. Must include: user onboarding flow, role-based access control, email notifications, and Stripe payment integration (mock).',
        'budget': Decimal('6000.00'),
        'experience_level': 'EXPERT',
        'category': 'Web Development',
        'skills': ['React', 'TypeScript', 'Django', 'PostgreSQL', 'REST API', 'Docker'],
        'days_until_deadline': 60,
    },
    {
        'title': 'React Native Cross-Platform Mobile App',
        'description': 'Develop a fitness tracking mobile application for iOS and Android using React Native and Expo. Features: workout logging, progress charts, social sharing, push notifications, and offline mode. Backend integration with existing Node.js API. Clean UI following platform design guidelines.',
        'budget': Decimal('4500.00'),
        'experience_level': 'INTERMEDIATE',
        'category': 'Mobile Development',
        'skills': ['React Native', 'Expo', 'JavaScript', 'TypeScript'],
        'days_until_deadline': 40,
    },
    {
        'title': 'Kubernetes & AWS Infrastructure Setup',
        'description': 'Set up production-grade Kubernetes cluster on AWS EKS with auto-scaling, monitoring (Prometheus + Grafana), centralized logging (ELK stack), and CI/CD pipeline using GitHub Actions. Must include Terraform IaC, security hardening, cost optimization, and full documentation.',
        'budget': Decimal('5000.00'),
        'experience_level': 'EXPERT',
        'category': 'DevOps & Cloud',
        'skills': ['Kubernetes', 'AWS', 'Terraform', 'Docker', 'GitHub Actions', 'Linux'],
        'days_until_deadline': 30,
    },
    {
        'title': 'Data Engineering Pipeline with Apache Kafka',
        'description': 'Design and implement a real-time data pipeline: Kafka for event streaming, Apache Spark for processing, dbt for transformations, and Snowflake as the data warehouse. Must handle 1M+ events/day with sub-second latency. Include monitoring dashboards, alerting, and disaster recovery.',
        'budget': Decimal('7200.00'),
        'experience_level': 'EXPERT',
        'category': 'Data Engineering',
        'skills': ['Apache Kafka', 'Apache Spark', 'dbt', 'Snowflake', 'Python', 'PySpark'],
        'days_until_deadline': 50,
    },
    {
        'title': 'DeFi Smart Contract Suite (Ethereum)',
        'description': 'Develop audited smart contracts for a decentralized lending protocol: yield farming, liquidity pools, governance token, and emergency pause mechanisms. Solidity with OpenZeppelin, Hardhat testing suite, 95%+ test coverage. Includes formal verification and security review.',
        'budget': Decimal('12000.00'),
        'experience_level': 'EXPERT',
        'category': 'Blockchain',
        'skills': ['Solidity', 'Ethereum', 'Web3.js', 'Hardhat', 'DeFi', 'Rust'],
        'days_until_deadline': 75,
    },
    {
        'title': 'UI/UX Redesign for B2B SaaS Platform',
        'description': 'Complete UX audit and redesign of our project management SaaS. Deliverables: user research report, 50+ screen Figma prototype, design system documentation, developer handoff kit. Must improve task completion rate by 30% based on user testing. Experience with B2B enterprise software required.',
        'budget': Decimal('3500.00'),
        'experience_level': 'INTERMEDIATE',
        'category': 'UI/UX Design',
        'skills': ['Figma', 'Prototyping', 'User Research', 'Wireframing'],
        'days_until_deadline': 35,
    },
    {
        'title': 'Security Audit & Penetration Testing',
        'description': 'Comprehensive security assessment of our fintech web application and API. Scope: OWASP Top 10, API security testing, authentication bypass, privilege escalation, data leakage. Deliverables: executive summary report, technical findings with CVSS scores, remediation guide, and re-test validation.',
        'budget': Decimal('4000.00'),
        'experience_level': 'EXPERT',
        'category': 'Cybersecurity',
        'skills': ['Penetration Testing', 'Burp Suite', 'OWASP', 'Network Security', 'Ethical Hacking'],
        'days_until_deadline': 21,
    },
    {
        'title': 'Django REST API with GraphQL Integration',
        'description': 'Build a high-performance REST + GraphQL API backend for a social media platform. Django, PostgreSQL with pgvector for semantic search, Redis caching, Celery for background tasks. Features: real-time notifications, content feed algorithm, media processing, rate limiting. Docker containerization.',
        'budget': Decimal('5500.00'),
        'experience_level': 'EXPERT',
        'category': 'Backend Development',
        'skills': ['Python', 'Django', 'GraphQL', 'PostgreSQL', 'Redis', 'Celery', 'REST API', 'Docker'],
        'days_until_deadline': 55,
    },
    {
        'title': 'Machine Learning NLP Chatbot',
        'description': 'Create an intelligent customer service chatbot using LangChain and OpenAI GPT-4. Features: intent classification, entity extraction, multi-turn conversations, RAG (Retrieval Augmented Generation) over company documentation, escalation to human agents. Python backend with React chat widget.',
        'budget': Decimal('6800.00'),
        'experience_level': 'EXPERT',
        'category': 'AI & Machine Learning',
        'skills': ['Python', 'LangChain', 'OpenAI API', 'NLP', 'React'],
        'days_until_deadline': 42,
    },
    {
        'title': 'Next.js E-Commerce Platform',
        'description': 'Build a performant e-commerce storefront with Next.js 14 App Router, TypeScript, and Stripe payments. Features: SSR product pages, dynamic routing, shopping cart, checkout flow, order management, admin dashboard. Optimized for Core Web Vitals and SEO. Vercel deployment.',
        'budget': Decimal('3800.00'),
        'experience_level': 'INTERMEDIATE',
        'category': 'Web Development',
        'skills': ['Next.js', 'React', 'TypeScript', 'JavaScript', 'HTML/CSS'],
        'days_until_deadline': 30,
    },
    {
        'title': 'Data Science Analytics Platform',
        'description': 'Build an automated market research analytics pipeline. Data collection from APIs, cleaning with Pandas, statistical analysis, ML forecasting models, and interactive Tableau-style dashboards. Must include weekly automated reports in PDF format.',
        'budget': Decimal('4200.00'),
        'experience_level': 'INTERMEDIATE',
        'category': 'Data Science',
        'skills': ['Python', 'Pandas', 'NumPy', 'Matplotlib', 'Scikit-learn', 'Jupyter'],
        'days_until_deadline': 45,
    },
]


class Command(BaseCommand):
    help = 'Seed the database with sample categories, skills, users, and projects for development.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all seeded data before re-seeding.'
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options.get('clear'):
            self.stdout.write(self.style.WARNING('Clearing existing seed data...'))
            Project.objects.all().delete()
            User.objects.filter(email__endswith='@freelancehub.dev').delete()
            Category.objects.all().delete()
            Skill.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Cleared.'))

        self.stdout.write('Seeding categories and skills...')
        category_objects = {}
        from django.utils.text import slugify
        for cat_data in CATEGORIES:
            slug = slugify(cat_data['name'])
            try:
                cat = Category.objects.get(slug=slug)
                category_objects[cat_data['name']] = cat
            except Category.DoesNotExist:
                try:
                    cat = Category.objects.create(
                        name=cat_data['name'],
                        slug=slug,
                        icon=cat_data['icon'],
                        description=cat_data['description'],
                    )
                    category_objects[cat_data['name']] = cat
                    self.stdout.write(f'  + Category: {cat.name}')
                except Exception:
                    cat = Category.objects.filter(name=cat_data['name']).first()
                    if cat:
                        category_objects[cat_data['name']] = cat

        skill_objects = {}
        for cat_name, skills in SKILLS_BY_CATEGORY.items():
            cat = category_objects.get(cat_name)
            for skill_name in skills:
                skill, created = Skill.objects.get_or_create(
                    name=skill_name,
                    defaults={'category': cat}
                )
                skill_objects[skill_name] = skill

        self.stdout.write(self.style.SUCCESS(f'Created {len(category_objects)} categories and {len(skill_objects)} skills.'))

        # Create sample customer
        self.stdout.write('Creating sample customer account...')
        customer_user, created = User.objects.get_or_create(
            email='customer@freelancehub.dev',
            defaults={
                'first_name': 'Sarah',
                'last_name': 'Mitchell',
                'role': User.Role.CUSTOMER,
                'is_active': True,
            }
        )
        if created:
            customer_user.set_password('FreelanceHub@2024')
            customer_user.save()
            CustomerProfile.objects.get_or_create(
                user=customer_user,
                defaults={
                    'company_name': 'TechVenture Inc.',
                    'company_bio': 'Building next-generation SaaS products with distributed engineering teams.',
                    'website': 'https://techventure.dev',
                    'location': 'San Francisco, CA',
                }
            )
            self.stdout.write(f'  + Customer: {customer_user.email} / password: FreelanceHub@2024')

        # Create sample freelancers
        freelancer_data = [
            {
                'email': 'alex.chen@freelancehub.dev',
                'first_name': 'Alex',
                'last_name': 'Chen',
                'title': 'Senior Full-Stack Engineer & System Architect',
                'bio': '8+ years building scalable web applications. Expert in React, Django, PostgreSQL, and AWS. Led engineering teams at two Series B startups.',
                'experience_level': 'EXPERT',
                'hourly_rate': Decimal('95.00'),
                'location': 'Seattle, WA',
                'skills': ['React', 'Django', 'PostgreSQL', 'TypeScript', 'Docker', 'AWS', 'REST API'],
            },
            {
                'email': 'priya.singh@freelancehub.dev',
                'first_name': 'Priya',
                'last_name': 'Singh',
                'title': 'ML Engineer & AI Research Specialist',
                'bio': 'PhD in Computer Science, 6 years in production ML. Published researcher in NLP and computer vision. Built recommendation systems used by 10M+ users.',
                'experience_level': 'EXPERT',
                'hourly_rate': Decimal('110.00'),
                'location': 'Austin, TX',
                'skills': ['Python', 'TensorFlow', 'PyTorch', 'LangChain', 'OpenAI API', 'NLP', 'Scikit-learn'],
            },
            {
                'email': 'carlos.morales@freelancehub.dev',
                'first_name': 'Carlos',
                'last_name': 'Morales',
                'title': 'DevOps & Cloud Infrastructure Engineer',
                'bio': '5 years specializing in Kubernetes, Terraform, and AWS. Designed zero-downtime deployment pipelines for enterprise clients. AWS Certified Solutions Architect.',
                'experience_level': 'EXPERT',
                'hourly_rate': Decimal('85.00'),
                'location': 'Miami, FL',
                'skills': ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'GitHub Actions', 'Linux'],
            },
        ]

        customer_profile = getattr(customer_user, 'customer_profile', None)
        if not customer_profile:
            customer_profile, _ = CustomerProfile.objects.get_or_create(user=customer_user)

        for fd in freelancer_data:
            fl_user, created = User.objects.get_or_create(
                email=fd['email'],
                defaults={
                    'first_name': fd['first_name'],
                    'last_name': fd['last_name'],
                    'role': User.Role.FREELANCER,
                    'is_active': True,
                    'is_verified': True,
                }
            )
            if created:
                fl_user.set_password('FreelanceHub@2024')
                fl_user.save()

                fl_profile, _ = FreelancerProfile.objects.get_or_create(
                    user=fl_user,
                    defaults={
                        'title': fd['title'],
                        'bio': fd['bio'],
                        'experience_level': fd['experience_level'],
                        'hourly_rate': fd['hourly_rate'],
                        'location': fd['location'],
                    }
                )

                for skill_name in fd['skills']:
                    skill = skill_objects.get(skill_name)
                    if skill:
                        fl_profile.skills.add(skill)

                self.stdout.write(f'  + Freelancer: {fl_user.email}')

        # Create sample projects
        self.stdout.write('Creating sample projects...')
        project_count = 0
        for proj_data in SAMPLE_PROJECTS:
            if Project.objects.filter(title=proj_data['title']).exists():
                continue

            cat = category_objects.get(proj_data['category'])
            project = Project.objects.create(
                customer=customer_profile,
                title=proj_data['title'],
                description=proj_data['description'],
                category=cat,
                budget=proj_data['budget'],
                experience_level=proj_data['experience_level'],
                deadline=date.today() + timedelta(days=proj_data['days_until_deadline']),
                status=Project.Status.OPEN,
            )

            for skill_name in proj_data['skills']:
                skill = skill_objects.get(skill_name)
                if skill:
                    project.skills.add(skill)

            project_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nSeed completed successfully!'
            f'\n  * {len(category_objects)} categories'
            f'\n  * {len(skill_objects)} skills'
            f'\n  * 1 customer (customer@freelancehub.dev / FreelanceHub@2024)'
            f'\n  * {len(freelancer_data)} freelancers (*@freelancehub.dev / FreelanceHub@2024)'
            f'\n  * {project_count} sample projects'
        ))
