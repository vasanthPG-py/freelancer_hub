from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from accounts.models import User
from profiles.models import Category, Skill, FreelancerProfile, CustomerProfile, Portfolio, Resume
from projects.models import Project, Contract, Milestone
from bids.models import Bid, BidMilestone
from assessments.models import Assessment, FALLBACK_QUESTIONS
from messaging.models import Conversation, Message, Notification
from reviews.models import Review
from payments.models import Transaction

DEMO_DOMAIN = '@demo.freelancehub.test'
DEMO_PASSWORD = 'DemoPassword123!'

class Command(BaseCommand):
    help = 'Seeds PostgreSQL with comprehensive demo datasets for FreelanceHub development.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Removes existing demo records before seeding fresh data without touching real user accounts.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        reset_mode = options.get('reset', False)

        if reset_mode:
            self.stdout.write(self.style.WARNING("Removing existing demo records (@demo.freelancehub.test)..."))
            # Remove demo users (cascades to customer/freelancer profiles, projects, bids, contracts, milestones)
            deleted_users, _ = User.objects.filter(email__endswith=DEMO_DOMAIN).delete()
            self.stdout.write(f"Removed {deleted_users} demo user/profile records.")

        self.stdout.write(self.style.NOTICE("1. Seeding Categories (10 records)..."))
        categories_data = [
            ("Full-Stack Web Development", "full-stack-web-dev", "Django, React, Node.js, and web application engineering.", "💻"),
            ("AI & Machine Learning", "ai-machine-learning", "LLMs, computer vision, PyTorch, RAG architectures, and fine-tuning.", "🤖"),
            ("Cloud & DevOps", "cloud-devops", "Kubernetes, Docker, AWS, Terraform, and CI/CD automated delivery pipelines.", "☁️"),
            ("Mobile App Development", "mobile-app-dev", "Native iOS, Android, React Native, and cross-platform apps.", "📱"),
            ("UI/UX & Product Design", "ui-ux-design", "User research, wireframing, Figma design systems, and rapid prototyping.", "🎨"),
            ("Data Engineering & SQL", "data-engineering", "PostgreSQL, Snowflake, ETL pipelines, and high-throughput analytics.", "📊"),
            ("Cybersecurity & AppSec", "cybersecurity", "Penetration testing, vulnerability assessments, and authentication hardening.", "🛡️"),
            ("Blockchain & Smart Contracts", "blockchain", "Ethereum, Solidity, Web3 integrations, and decentralized architectures.", "⛓️"),
            ("Embedded Systems & IoT", "embedded-systems", "Firmware, C/C++, sensor integrations, and IoT protocols.", "🔌"),
            ("QA Automation & Testing", "qa-automation", "End-to-end testing, Playwright, Jest, PyTest, and test frameworks.", "🧪"),
        ]

        category_objs = {}
        for name, slug, desc, icon in categories_data:
            cat, _ = Category.objects.get_or_create(
                slug=slug,
                defaults={'name': name, 'description': desc, 'icon': icon}
            )
            category_objs[slug] = cat

        self.stdout.write(self.style.NOTICE("2. Seeding Skills (20 records)..."))
        skills_data = [
            ("Python", "full-stack-web-dev"),
            ("React", "full-stack-web-dev"),
            ("Django", "full-stack-web-dev"),
            ("PostgreSQL", "data-engineering"),
            ("Docker", "cloud-devops"),
            ("Kubernetes", "cloud-devops"),
            ("PyTorch", "ai-machine-learning"),
            ("LLMs & RAG", "ai-machine-learning"),
            ("TypeScript", "full-stack-web-dev"),
            ("AWS", "cloud-devops"),
            ("Terraform", "cloud-devops"),
            ("React Native", "mobile-app-dev"),
            ("Swift", "mobile-app-dev"),
            ("Figma", "ui-ux-design"),
            ("Snowflake", "data-engineering"),
            ("GraphQL", "full-stack-web-dev"),
            ("FastAPI", "full-stack-web-dev"),
            ("Penetration Testing", "cybersecurity"),
            ("Solidity", "blockchain"),
            ("PyTest & Jest", "qa-automation"),
        ]

        skill_objs = {}
        for skill_name, cat_slug in skills_data:
            skill, _ = Skill.objects.get_or_create(
                name=skill_name,
                defaults={'category': category_objs.get(cat_slug)}
            )
            skill_objs[skill_name] = skill

        self.stdout.write(self.style.NOTICE("3. Seeding Customer Accounts & Profiles (10 records)..."))
        customers_data = [
            ("alice.vance", "Alice", "Vance", "Apex Innovations Inc.", "Building scalable enterprise AI tooling.", "https://apex-innovations.test", "Austin, TX"),
            ("brian.miller", "Brian", "Miller", "Nexus Cloud Dynamics", "Global distributed cloud infrastructure providers.", "https://nexus-cloud.test", "Seattle, WA"),
            ("clara.oswald", "Clara", "Oswald", "Starlight Health Tech", "Secure patient record management and healthcare tele-clinics.", "https://starlight-health.test", "Boston, MA"),
            ("david.zhang", "David", "Zhang", "Hyperion Financial Systems", "Low-latency algorithmic trading infrastructure.", "https://hyperion-fin.test", "New York, NY"),
            ("elena.gomez", "Elena", "Gomez", "Solaria Media Group", "Streaming content delivery networks and video processing.", "https://solaria-media.test", "Los Angeles, CA"),
            ("felix.wright", "Felix", "Wright", "Vanguard Logistics Co.", "Next-generation fleet tracking and automated dispatching.", "https://vanguard-logistics.test", "Chicago, IL"),
            ("grace.hopper", "Grace", "Hopper-Jones", "Quantum Core Analytics", "High-throughput predictive modeling for biotech enterprises.", "https://quantum-core.test", "San Francisco, CA"),
            ("hector.salamanca", "Hector", "Salamanca", "Albuquerque Wholesale Systems", "Regional distribution and warehouse management ERP systems.", "https://abq-wholesale.test", "Albuquerque, NM"),
            ("isla.fischer", "Isla", "Fischer", "Blue Horizon Education", "Interactive STEM learning management systems for colleges.", "https://blue-horizon.test", "Denver, CO"),
            ("jonas.kahn", "Jonas", "Kahn", "Winden Energy Solutions", "Smart grid monitoring and renewable telemetry systems.", "https://winden-energy.test", "Atlanta, GA"),
        ]

        customer_profile_objs = []
        for uname, fname, lname, comp_name, comp_bio, site, loc in customers_data:
            email = f"{uname}{DEMO_DOMAIN}"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': fname,
                    'last_name': lname,
                    'role': User.Role.CUSTOMER,
                    'is_verified': False,
                    'phone_number': '+1-555-0100',
                }
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()

            cust_profile, _ = CustomerProfile.objects.get_or_create(user=user)
            cust_profile.company_name = comp_name
            cust_profile.company_bio = comp_bio
            cust_profile.website = site
            cust_profile.location = loc
            cust_profile.save()
            customer_profile_objs.append(cust_profile)

        self.stdout.write(self.style.NOTICE("4. Seeding Freelancer Accounts, Profiles & Skills (10 records)..."))
        freelancers_data = [
            (
                "liam.oconnor", "Liam", "O'Connor",
                "Senior Full-Stack & Python Architect",
                "Specialized in high-scale Django REST APIs, React architectures, and distributed systems with 9+ years experience.",
                "EXPERT", 95.00, "New York, NY", True,
                ["Python", "Django", "React", "PostgreSQL", "Docker"],
                "Liam O'Connor - Senior Full Stack Engineer with 9+ years building distributed Python and React architectures. Proficient in Django REST Framework, PostgreSQL optimization, Docker containerization, and modern JavaScript."
            ),
            (
                "maya.patel", "Maya", "Patel",
                "Staff AI & Machine Learning Engineer",
                "Deep experience fine-tuning LLMs, building production RAG pipelines, and deploying PyTorch models at scale.",
                "EXPERT", 110.00, "San Francisco, CA", True,
                ["Python", "PyTorch", "LLMs & RAG", "FastAPI", "Docker"],
                "Maya Patel - AI & ML specialist. M.S. in Computer Science. Built production retrieval-augmented generation systems, fine-tuned transformer models, and architected low-latency inference endpoints with FastAPI and PyTorch."
            ),
            (
                "noah.kim", "Noah", "Kim",
                "Cloud Solutions & Kubernetes Specialist",
                "Expert in Terraform infrastructure as code, automated multi-cluster Kubernetes, and AWS cloud architecture.",
                "EXPERT", 85.00, "Austin, TX", True,
                ["Docker", "Kubernetes", "AWS", "Terraform", "Python"],
                "Noah Kim - Certified AWS Solutions Architect and Kubernetes Administrator (CKA). 7 years designing zero-downtime CI/CD workflows, Terraform modules, and secure container infrastructures."
            ),
            (
                "olivia.dubois", "Olivia", "Dubois",
                "Principal UI/UX Designer & Design Systems Lead",
                "Creating intuitive, accessible web and mobile products. Expert in design tokens, Figma component systems, and UX research.",
                "INTERMEDIATE", 70.00, "Montreal, Canada", True,
                ["Figma", "React", "TypeScript"],
                "Olivia Dubois - UI/UX Designer with front-end literacy. Created enterprise design systems in Figma and collaborated closely with engineering teams using React and vanilla CSS design tokens."
            ),
            (
                "ethan.brooks", "Ethan", "Brooks",
                "Lead Mobile App Engineer (iOS & React Native)",
                "Delivering 5-star consumer and enterprise mobile applications across iOS and Android with seamless offline capabilities.",
                "INTERMEDIATE", 75.00, "London, UK", True,
                ["React Native", "Swift", "TypeScript", "GraphQL"],
                "Ethan Brooks - Mobile engineer with 6 years native iOS and React Native development. Published 12+ apps to the App Store, specializing in reactive state management and biometric authentication."
            ),
            (
                "sophia.chen", "Sophia", "Chen",
                "Senior Data Engineer & Analytics Architect",
                "Architecting high-throughput data lakes, Snowflake warehousing, and automated ETL workflows.",
                "EXPERT", 90.00, "Chicago, IL", True,
                ["PostgreSQL", "Snowflake", "Python", "FastAPI", "AWS"],
                "Sophia Chen - Data engineering specialist. Designed streaming and batch pipelines processing 50M+ records daily using PostgreSQL, Snowflake, and Python data pipelines."
            ),
            (
                "lucas.silva", "Lucas", "Silva",
                "Full-Stack Web Developer",
                "Passionate about building responsive, modern SaaS web apps with clean code, REST APIs, and delightful UX.",
                "INTERMEDIATE", 60.00, "Berlin, Germany", False,
                ["Python", "Django", "React", "PostgreSQL"],
                "Lucas Silva - Full stack web developer with 4 years hands-on experience building SaaS MVPs using Django REST framework and React."
            ),
            (
                "ava.reynolds", "Ava", "Reynolds",
                "DevOps & Reliability Engineer",
                "Passionate about observable systems, CI/CD pipelines, automated testing, and secure cloud deployments.",
                "INTERMEDIATE", 80.00, "Seattle, WA", True,
                ["AWS", "Docker", "Terraform", "PyTest & Jest"],
                "Ava Reynolds - Site reliability engineer focused on automated deployment pipelines, infrastructure as code, and production observability."
            ),
            (
                "mason.taylor", "Mason", "Taylor",
                "Application Security & Pen Testing Engineer",
                "Hardening web architectures, identifying vulnerabilities, and implementing robust OWASP-compliant security controls.",
                "EXPERT", 105.00, "Boston, MA", True,
                ["Penetration Testing", "Python", "Docker", "PostgreSQL"],
                "Mason Taylor - Offensive Security Certified Professional (OSCP). Conducted 40+ security audits and penetration tests for fintech and e-commerce platforms."
            ),
            (
                "chloe.martin", "Chloe", "Martin",
                "QA Automation & Test Architect",
                "Ensuring high software reliability through automated test suites, load testing, and regression suites.",
                "ENTRY", 55.00, "Denver, CO", False,
                ["PyTest & Jest", "Python", "React"],
                "Chloe Martin - Software tester focused on end-to-end automation, regression test suites, and API integration testing."
            ),
        ]

        freelancer_profile_objs = []
        for uname, fname, lname, title, bio, exp, rate, loc, is_ver, skill_names, r_text in freelancers_data:
            email = f"{uname}{DEMO_DOMAIN}"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': fname,
                    'last_name': lname,
                    'role': User.Role.FREELANCER,
                    'is_verified': is_ver,
                    'phone_number': '+1-555-0200',
                }
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()

            fl_profile, _ = FreelancerProfile.objects.get_or_create(user=user)
            fl_profile.title = title
            fl_profile.bio = bio
            fl_profile.experience_level = exp
            fl_profile.hourly_rate = rate
            fl_profile.location = loc
            fl_profile.resume_text = r_text
            fl_profile.save()

            for sname in skill_names:
                if sname in skill_objs:
                    fl_profile.skills.add(skill_objs[sname])

            freelancer_profile_objs.append(fl_profile)

        self.stdout.write(self.style.NOTICE("4b. Seeding Freelancer Resumes (10 records)..."))
        for fl_prof in freelancer_profile_objs:
            safe_lname = fl_prof.user.last_name.lower().replace("'", "").replace("-", "_")
            fname = f"resume_{fl_prof.user.first_name.lower()}_{safe_lname}.pdf"
            Resume.objects.get_or_create(
                freelancer=fl_prof,
                defaults={
                    'file': f"resumes/demo/{fname}",
                    'original_name': fname,
                    'file_size': 142000 + (len(fl_prof.resume_text) * 12),
                }
            )

        self.stdout.write(self.style.NOTICE("5. Seeding Portfolio Items (10 records)..."))
        portfolio_data = [
            (
                freelancer_profile_objs[0],
                "Real-Time FinTech Analytics Engine",
                "High-performance transaction processing engine with sub-50ms latency using Django REST, PostgreSQL, and React charts.",
                "https://demo.fintech-analytics.test",
                ["Python", "Django", "React", "PostgreSQL"]
            ),
            (
                freelancer_profile_objs[0],
                "Distributed Event Streaming Dashboard",
                "WebSocket-enabled observability UI monitoring microservice event pipelines with React and custom styling.",
                "https://demo.event-stream.test",
                ["React", "TypeScript", "Docker"]
            ),
            (
                freelancer_profile_objs[1],
                "Enterprise RAG Document Intelligence Platform",
                "Semantic document search answering complex legal queries across 100k+ PDF filings using PyTorch and vector embeddings.",
                "https://demo.rag-intel.test",
                ["Python", "PyTorch", "LLMs & RAG", "FastAPI"]
            ),
            (
                freelancer_profile_objs[1],
                "Voice-to-SQL Natural Language Query Engine",
                "Translating colloquial business questions into safe PostgreSQL queries using custom LLM prompt architectures.",
                "https://demo.voice-sql.test",
                ["Python", "LLMs & RAG", "PostgreSQL"]
            ),
            (
                freelancer_profile_objs[2],
                "Multi-Cloud Kubernetes Automation Framework",
                "GitOps-driven infrastructure deploying compliant clusters on AWS with zero manual interventions.",
                "https://demo.k8s-framework.test",
                ["Docker", "Kubernetes", "AWS", "Terraform"]
            ),
            (
                freelancer_profile_objs[3],
                "Design System & Token Architecture for FinServe",
                "Comprehensive component library with 200+ accessible tokens, tested for WCAG AAA compliance.",
                "https://demo.finserve-ds.test",
                ["Figma", "React", "TypeScript"]
            ),
            (
                freelancer_profile_objs[4],
                "Cross-Platform Telehealth Mobile Application",
                "Encrypted video consultation app with offline sync and Apple HealthKit integration.",
                "https://demo.telehealth-app.test",
                ["React Native", "Swift", "TypeScript"]
            ),
            (
                freelancer_profile_objs[5],
                "High-Throughput IoT Telemetry Pipeline",
                "Data pipeline processing 10,000 sensor telemetry messages per second into Snowflake with automated partitions.",
                "https://demo.iot-snowflake.test",
                ["Python", "Snowflake", "PostgreSQL", "AWS"]
            ),
            (
                freelancer_profile_objs[7],
                "Automated Cloud Compliance Guardrails",
                "Automated continuous security scanning auditing IAM policies and S3 encryption on AWS accounts.",
                "https://demo.cloud-guardrails.test",
                ["AWS", "Terraform", "Python"]
            ),
            (
                freelancer_profile_objs[8],
                "Zero-Trust Identity & API Security Gateway",
                "OAuth2 and JWT token validation reverse proxy blocking unauthorized API requests and preventing rate abuses.",
                "https://demo.zerotrust-gateway.test",
                ["Penetration Testing", "Python", "Docker"]
            ),
        ]

        for profile, title, desc, url, p_skills in portfolio_data:
            port, _ = Portfolio.objects.get_or_create(
                freelancer=profile,
                title=title,
                defaults={'description': desc, 'project_url': url}
            )
            for sname in p_skills:
                if sname in skill_objs:
                    port.skills.add(skill_objs[sname])

        self.stdout.write(self.style.NOTICE("6. Seeding Open Marketplace Projects (10 records)..."))
        now = timezone.now().date()
        open_projects_data = [
            (
                customer_profile_objs[0],
                "Enterprise Document Q&A with Retrieval-Augmented Generation (RAG)",
                "We need an AI engineer to build a production-ready RAG application over our proprietary documentation. Must integrate vector storage, citation tracing, and low latency responses.",
                "ai-machine-learning", 5500.00, "EXPERT", now + timedelta(days=25),
                ["Python", "PyTorch", "LLMs & RAG", "FastAPI"]
            ),
            (
                customer_profile_objs[1],
                "Multi-Tenant SaaS Subscription Platform with Stripe & Django",
                "Seeking an experienced full-stack architect to refactor our Django REST API backend and integrate tiered usage-based metering, webhook listeners, and React administrative dashboards.",
                "full-stack-web-dev", 7200.00, "EXPERT", now + timedelta(days=35),
                ["Python", "Django", "React", "PostgreSQL"]
            ),
            (
                customer_profile_objs[2],
                "HIPAA-Compliant Patient Telehealth Mobile App",
                "Looking for a React Native specialist to engineer an encrypted mobile consultation workflow with biometric authentication, offline form synchronization, and video consultation.",
                "mobile-app-dev", 6800.00, "INTERMEDIATE", now + timedelta(days=30),
                ["React Native", "TypeScript", "GraphQL"]
            ),
            (
                customer_profile_objs[3],
                "High-Throughput Algorithmic Trading Analytics Dashboard",
                "Need a React and Python specialist to construct an ultra-responsive trade execution dashboard capable of charting 5,000 updates/second with WebSocket data feeds.",
                "full-stack-web-dev", 8500.00, "EXPERT", now + timedelta(days=20),
                ["React", "Python", "PostgreSQL", "Docker"]
            ),
            (
                customer_profile_objs[4],
                "Global Content Delivery Network Infrastructure on AWS",
                "Architect multi-region Terraform modules to automate container deployments, edge caching with CloudFront, and automated SSL cert renewal across 12 zones.",
                "cloud-devops", 4800.00, "INTERMEDIATE", now + timedelta(days=18),
                ["AWS", "Terraform", "Docker"]
            ),
            (
                customer_profile_objs[5],
                "Automated Dispatch & Route Optimization Algorithm",
                "Build a Python route calculation microservice calculating shortest-time fleet dispatches given dynamic traffic constraints and vehicle capacities.",
                "data-engineering", 3600.00, "INTERMEDIATE", now + timedelta(days=14),
                ["Python", "PostgreSQL", "FastAPI"]
            ),
            (
                customer_profile_objs[6],
                "Biotech Genomic Data Pipeline into Snowflake",
                "Construct automated batch and streaming ETL workflows converting DNA sequence outputs into structured Snowflake relational warehouses.",
                "data-engineering", 9500.00, "EXPERT", now + timedelta(days=45),
                ["Snowflake", "PostgreSQL", "Python", "AWS"]
            ),
            (
                customer_profile_objs[7],
                "Regional Warehouse Barcode Scanner & Inventory UI",
                "Develop a mobile-friendly progressive web application in React for warehouse staff to scan stock items, log inventory variance, and sync with ERP backend.",
                "full-stack-web-dev", 2900.00, "ENTRY", now + timedelta(days=12),
                ["React", "Django", "TypeScript"]
            ),
            (
                customer_profile_objs[8],
                "Modern Accessible Design System for STEM Learning",
                "Create a comprehensive Figma design system featuring 150+ interactive accessible UI tokens, interactive states, and responsive student dashboards.",
                "ui-ux-design", 3200.00, "INTERMEDIATE", now + timedelta(days=15),
                ["Figma", "React"]
            ),
            (
                customer_profile_objs[9],
                "Smart Grid SCADA Telemetry Security Audit & Pentest",
                "Perform black-box and grey-box application security assessment on smart meter IoT ingestion endpoints, identifying protocol flaws and rate vulnerabilities.",
                "cybersecurity", 6200.00, "EXPERT", now + timedelta(days=21),
                ["Penetration Testing", "Python", "Docker"]
            ),
        ]

        open_project_objs = []
        for cust, ptitle, pdesc, cat_slug, pbudget, pexp, pdead, pskills in open_projects_data:
            proj, _ = Project.objects.get_or_create(
                customer=cust,
                title=ptitle,
                defaults={
                    'description': pdesc,
                    'category': category_objs.get(cat_slug),
                    'budget': pbudget,
                    'experience_level': pexp,
                    'deadline': pdead,
                    'status': Project.Status.OPEN,
                }
            )
            for sname in pskills:
                if sname in skill_objs:
                    proj.skills.add(skill_objs[sname])
            open_project_objs.append(proj)

        self.stdout.write(self.style.NOTICE("7. Seeding Bids and Proposals (10+ records with varied statuses)..."))
        bids_seed_data = [
            (open_project_objs[0], freelancer_profile_objs[1], 5200.00, 20, "I have built production RAG systems with LangChain and PyTorch. Here is my execution blueprint.", Bid.Status.SHORTLISTED),
            (open_project_objs[0], freelancer_profile_objs[0], 5400.00, 22, "Extensive experience integrating vector stores with Django REST.", Bid.Status.PENDING),
            (open_project_objs[1], freelancer_profile_objs[0], 7000.00, 30, "I have architected multi-tenant Django SaaS platforms handling millions in annual GMV.", Bid.Status.SHORTLISTED),
            (open_project_objs[1], freelancer_profile_objs[6], 6500.00, 32, "Strong full-stack experience in React and Django. Ready to begin immediately.", Bid.Status.PENDING),
            (open_project_objs[2], freelancer_profile_objs[4], 6500.00, 28, "Published 12+ apps to App Store with biometric security and React Native.", Bid.Status.PENDING),
            (open_project_objs[3], freelancer_profile_objs[0], 8200.00, 18, "Sub-50ms WebSocket streaming specialist. I will deliver high-throughput charts.", Bid.Status.PENDING),
            (open_project_objs[4], freelancer_profile_objs[2], 4600.00, 15, "Certified AWS Architect. I will deliver modular, reusable Terraform scripts.", Bid.Status.PENDING),
            (open_project_objs[5], freelancer_profile_objs[5], 3400.00, 12, "Data engineer specializing in Python optimization algorithms and spatial queries.", Bid.Status.PENDING),
            (open_project_objs[6], freelancer_profile_objs[5], 9200.00, 40, "Handled massive data migrations into Snowflake. Ready to architect pipeline.", Bid.Status.PENDING),
            (open_project_objs[7], freelancer_profile_objs[6], 2800.00, 10, "Built multiple warehouse and inventory web apps with offline capabilities.", Bid.Status.PENDING),
            (open_project_objs[8], freelancer_profile_objs[3], 3000.00, 14, "Figma design system lead. Will deliver complete token architecture.", Bid.Status.PENDING),
            (open_project_objs[9], freelancer_profile_objs[8], 6000.00, 18, "OSCP certified. Comprehensive report mapping to OWASP standards.", Bid.Status.PENDING),
            (open_project_objs[0], freelancer_profile_objs[6], 4900.00, 24, "Alternative candidate proposal.", Bid.Status.REJECTED),
            (open_project_objs[1], freelancer_profile_objs[7], 6800.00, 30, "Withdrawn bid due to scheduling conflict.", Bid.Status.WITHDRAWN),
        ]

        for p, fl, amt, days, cov, bstatus in bids_seed_data:
            bid, _ = Bid.objects.get_or_create(
                project=p,
                freelancer=fl,
                defaults={
                    'bid_amount': amt,
                    'delivery_days': days,
                    'cover_letter': cov,
                    'status': bstatus,
                }
            )
            # Add proposed milestones
            half = amt / 2
            BidMilestone.objects.get_or_create(bid=bid, title="Phase 1: Architecture & Core API", defaults={'amount': half, 'delivery_days': days // 2})
            BidMilestone.objects.get_or_create(bid=bid, title="Phase 2: Final Delivery & Polish", defaults={'amount': half, 'delivery_days': days // 2})

        self.stdout.write(self.style.NOTICE("8. Seeding Hired Projects, Contracts & Milestones (10 records)..."))
        hired_projects_data = [
            (
                customer_profile_objs[0], freelancer_profile_objs[0],
                "Enterprise SSO & OAuth2 Authorization Server",
                "Build centralized identity provider with Django and JWT tokens.",
                "cybersecurity", 4200.00, Contract.Status.ACTIVE,
                [("OAuth2 Protocol Setup", 2100.00, Milestone.Status.APPROVED), ("JWT Token Rotation & Client SDK", 2100.00, Milestone.Status.FUNDED)]
            ),
            (
                customer_profile_objs[1], freelancer_profile_objs[2],
                "Production Kubernetes Cluster Migration",
                "Zero-downtime migration of 14 microservices to EKS with Helm charts.",
                "cloud-devops", 5600.00, Contract.Status.ACTIVE,
                [("EKS Cluster Provisioning via Terraform", 2800.00, Milestone.Status.APPROVED), ("Microservices Helm Migration", 2800.00, Milestone.Status.SUBMITTED)]
            ),
            (
                customer_profile_objs[2], freelancer_profile_objs[1],
                "Clinical Trial Entity Recognition Model",
                "Extract biomedical entities from medical research papers using PyTorch transformers.",
                "ai-machine-learning", 6400.00, Contract.Status.ACTIVE,
                [("NER Pipeline Model Fine-Tuning", 3200.00, Milestone.Status.APPROVED), ("REST Inference API Containerization", 3200.00, Milestone.Status.FUNDED)]
            ),
            (
                customer_profile_objs[3], freelancer_profile_objs[5],
                "Tick-Data Parquet Compression Engine",
                "Compress and index market trades into DuckDB and Parquet archives.",
                "data-engineering", 4800.00, Contract.Status.COMPLETED,
                [("DuckDB Ingestion Engine", 2400.00, Milestone.Status.APPROVED), ("Compression & Benchmarks", 2400.00, Milestone.Status.APPROVED)]
            ),
            (
                customer_profile_objs[4], freelancer_profile_objs[3],
                "Streaming Media Player UI & Design Tokens",
                "Design tokens and dark-mode player component system in Figma and React.",
                "ui-ux-design", 3500.00, Contract.Status.COMPLETED,
                [("Design System Figma Specifications", 1750.00, Milestone.Status.APPROVED), ("React Player Components", 1750.00, Milestone.Status.APPROVED)]
            ),
            (
                customer_profile_objs[5], freelancer_profile_objs[4],
                "Driver Fleet Dispatch Mobile Application",
                "Cross-platform React Native app with geolocation background sync.",
                "mobile-app-dev", 5800.00, Contract.Status.ACTIVE,
                [("Background Geolocation Service", 2900.00, Milestone.Status.APPROVED), ("Dispatch Order Interface", 2900.00, Milestone.Status.SUBMITTED)]
            ),
            (
                customer_profile_objs[6], freelancer_profile_objs[7],
                "Automated Cloud Cost Optimizer & Waste Scanner",
                "AWS Lambda script detecting unattached EBS volumes and idle clusters.",
                "cloud-devops", 2800.00, Contract.Status.COMPLETED,
                [("Scanner Script Engine", 1400.00, Milestone.Status.APPROVED), ("Slack Notification Bot Integration", 1400.00, Milestone.Status.APPROVED)]
            ),
            (
                customer_profile_objs[7], freelancer_profile_objs[0],
                "E-Commerce B2B Purchase Order API",
                "Django REST endpoints managing bulk customer orders with inventory reservation.",
                "full-stack-web-dev", 4500.00, Contract.Status.ACTIVE,
                [("Order API & Data Models", 2250.00, Milestone.Status.APPROVED), ("Payment Gateway Webhook Handlers", 2250.00, Milestone.Status.FUNDED)]
            ),
            (
                customer_profile_objs[8], freelancer_profile_objs[9],
                "Automated Regression Test Suite for Portal",
                "PyTest and Playwright end-to-end testing coverage across 80 user flows.",
                "qa-automation", 3100.00, Contract.Status.COMPLETED,
                [("Core Flow Test Scenarios", 1550.00, Milestone.Status.APPROVED), ("CI Pipeline GitHub Actions Hook", 1550.00, Milestone.Status.APPROVED)]
            ),
            (
                customer_profile_objs[9], freelancer_profile_objs[8],
                "Smart Inverter Firmware Security Assessment",
                "Binary analysis and reverse engineering of embedded firmware communications.",
                "cybersecurity", 7500.00, Contract.Status.ACTIVE,
                [("Binary Disassembly & Flaw Discovery", 3750.00, Milestone.Status.APPROVED), ("Firmware Hardening Guidelines", 3750.00, Milestone.Status.SUBMITTED)]
            ),
        ]

        for cust, fl, title, desc, cat_slug, tot_amt, cstatus, m_tuples in hired_projects_data:
            proj_status = Project.Status.COMPLETED if cstatus == Contract.Status.COMPLETED else Project.Status.IN_PROGRESS
            proj, _ = Project.objects.get_or_create(
                customer=cust,
                title=title,
                defaults={
                    'description': desc,
                    'category': category_objs.get(cat_slug),
                    'budget': tot_amt,
                    'experience_level': "EXPERT",
                    'deadline': now + timedelta(days=15),
                    'status': proj_status,
                }
            )

            # Create accepted bid
            bid, _ = Bid.objects.get_or_create(
                project=proj,
                freelancer=fl,
                defaults={
                    'bid_amount': tot_amt,
                    'delivery_days': 20,
                    'cover_letter': f"Accepted proposal for {title}.",
                    'status': Bid.Status.ACCEPTED,
                }
            )

            contract, _ = Contract.objects.get_or_create(
                project=proj,
                defaults={
                    'customer': cust,
                    'freelancer': fl,
                    'accepted_bid': bid,
                    'total_amount': tot_amt,
                    'status': cstatus,
                }
            )

            for m_title, m_amt, m_status in m_tuples:
                Milestone.objects.get_or_create(
                    contract=contract,
                    title=m_title,
                    defaults={'amount': m_amt, 'status': m_status}
                )

        self.stdout.write(self.style.NOTICE("9. Seeding AI Skill Assessments (10 records)..."))
        for idx, fl_prof in enumerate(freelancer_profile_objs):
            is_ver = fl_prof.user.is_verified
            # 8 passed (score 80-98%), 2 not passed (40% and 50%)
            score_val = Decimal(str(80.00 + (idx * 2))) if is_ver else Decimal('40.00' if idx == 6 else '50.00')
            correct_cnt = int(score_val / 10)

            fl_skill_names = [s.name for s in fl_prof.skills.all()]
            cat = 'python' if 'Python' in fl_skill_names else 'javascript'
            bank = FALLBACK_QUESTIONS.get(cat, FALLBACK_QUESTIONS['general'])[:10]
            questions_data = [{**q, 'category': cat} for q in bank]

            answers_data = {}
            for q_idx in range(10):
                if q_idx < correct_cnt:
                    answers_data[str(q_idx)] = f"Detailed technical solution covering {' '.join(questions_data[q_idx].get('keywords', ['architecture']))}."
                else:
                    answers_data[str(q_idx)] = "Incomplete technical overview."

            assessment_obj, _ = Assessment.objects.get_or_create(
                freelancer=fl_prof,
                defaults={
                    'status': Assessment.Status.GRADED,
                    'questions': questions_data,
                    'answers': answers_data,
                    'score': score_val,
                    'passing_score': Decimal('60.00'),
                    'total_questions': 10,
                    'correct_answers': correct_cnt,
                    'duration_minutes': 30,
                    'started_at': timezone.now() - timedelta(days=4),
                    'submitted_at': timezone.now() - timedelta(days=4, minutes=-20),
                    'expires_at': timezone.now() - timedelta(days=4, minutes=-30),
                    'ai_generated': False,
                }
            )
            assessment_obj.assessed_skills.set(fl_prof.skills.all())

        # ── Phase 5: Conversations & Messages ────────────────────────────────
        self.stdout.write(self.style.NOTICE("10. Seeding Conversations & Messages (10 conversations, 30+ messages)..."))

        # Fetch contracts for conversation linking
        all_contracts = list(Contract.objects.select_related(
            'customer__user', 'freelancer__user', 'project'
        ).order_by('id')[:10])

        conversation_objs = []
        for contract in all_contracts:
            conv, _ = Conversation.objects.get_or_create(
                contract=contract,
                defaults={'project': contract.project}
            )
            conv.participants.add(contract.customer.user, contract.freelancer.user)
            conversation_objs.append(conv)

        # Seed messages for each conversation (3 messages each = 30 total)
        message_templates = [
            ("Hi! I just reviewed the contract scope and I'm ready to start. Do you have any initial questions?", True),
            ("Welcome aboard! Please begin with the architecture document and share it in the first milestone.", False),
            ("Understood. I'll have the first deliverable ready within 48 hours and will post an update here.", True),
        ]
        for conv in conversation_objs:
            participants = list(conv.participants.all())
            if len(participants) < 2:
                continue
            customer_user = next((p for p in participants if p.role == 'CUSTOMER'), participants[0])
            freelancer_user = next((p for p in participants if p.role == 'FREELANCER'), participants[1])
            for content, from_freelancer in message_templates:
                sender = freelancer_user if from_freelancer else customer_user
                Message.objects.get_or_create(
                    conversation=conv,
                    sender=sender,
                    content=content,
                )

        # ── Phase 5: Reviews ──────────────────────────────────────────────────
        self.stdout.write(self.style.NOTICE("11. Seeding Reviews (10 records for completed contracts)..."))
        completed_contracts = list(Contract.objects.filter(
            status=Contract.Status.COMPLETED
        ).select_related('customer__user', 'freelancer__user').order_by('id')[:10])

        review_comments_cust = [
            "Outstanding work – delivered ahead of schedule with zero rework needed.",
            "Excellent communication and technical depth. Highly recommend for complex projects.",
            "Transformed our vague spec into a polished product. Will hire again without hesitation.",
            "Superb problem-solver. Handled every edge case elegantly and explained the reasoning well.",
        ]
        review_comments_fl = [
            "Clear requirements from day one and quick feedback on every milestone. Ideal client.",
            "Responsive and supportive throughout the engagement. Made collaboration seamless.",
            "Well-structured project scope. Payments released promptly and feedback was constructive.",
            "Great client to work with – very professional and understood the technical nuances.",
        ]

        for idx, contract in enumerate(completed_contracts):
            cust_user = contract.customer.user
            fl_user = contract.freelancer.user
            rating = 5 if idx % 2 == 0 else 4

            # Customer → Freelancer review
            Review.objects.get_or_create(
                contract=contract,
                reviewer=cust_user,
                defaults={
                    'reviewee': fl_user,
                    'direction': Review.ReviewerRole.CUSTOMER_REVIEWING_FREELANCER,
                    'overall_rating': rating,
                    'communication_rating': rating,
                    'quality_rating': rating,
                    'timeliness_rating': max(rating - 1, 3),
                    'comment': review_comments_cust[idx % len(review_comments_cust)],
                    'is_public': True,
                }
            )

            # Freelancer → Customer review
            Review.objects.get_or_create(
                contract=contract,
                reviewer=fl_user,
                defaults={
                    'reviewee': cust_user,
                    'direction': Review.ReviewerRole.FREELANCER_REVIEWING_CUSTOMER,
                    'overall_rating': rating,
                    'communication_rating': rating,
                    'quality_rating': None,
                    'timeliness_rating': None,
                    'comment': review_comments_fl[idx % len(review_comments_fl)],
                    'is_public': True,
                }
            )

        # ── Phase 5: Notifications ────────────────────────────────────────────
        self.stdout.write(self.style.NOTICE("12. Seeding Notifications (20+ records)..."))
        notification_templates = [
            # (user_index_in_combined, is_customer, ntype, title, message, link)
            (0, True,  Notification.NotificationType.HIRE,       "Project Hired!",              "Your project has been assigned to a top-rated freelancer. Work begins now.",  "/dashboard"),
            (0, False, Notification.NotificationType.HIRE,       "You've been hired!",          "Congratulations! You were selected for a new contract. Check your dashboard.", "/dashboard"),
            (1, True,  Notification.NotificationType.MESSAGE,    "New message received",        "Your freelancer sent an update about the first milestone.",                    "/messages"),
            (1, False, Notification.NotificationType.MESSAGE,    "New message received",        "Your client responded to your last message. Reply to keep momentum going.",    "/messages"),
            (2, True,  Notification.NotificationType.MILESTONE,  "Milestone submitted",         "A milestone deliverable has been submitted and awaits your approval.",         "/dashboard"),
            (2, False, Notification.NotificationType.MILESTONE,  "Milestone approved & paid",   "Great news! Your milestone was approved and simulated payment released.",       "/dashboard"),
            (3, True,  Notification.NotificationType.REVIEW,     "New review posted",           "Your freelancer left a review for the completed project.",                     "/profile"),
            (3, False, Notification.NotificationType.REVIEW,     "New review posted",           "Your client left a 5-star review for your work. View your updated profile.",   "/profile"),
            (4, True,  Notification.NotificationType.BID,        "New bid received",            "A verified freelancer submitted a proposal for your project.",                 "/dashboard"),
            (4, False, Notification.NotificationType.ASSESSMENT, "Assessment passed!",          "You scored above 60% — your profile is now marked as Verified ✓.",            "/assessment"),
        ]

        all_customers = list(CustomerProfile.objects.select_related('user').order_by('id')[:5])
        all_freelancers = list(FreelancerProfile.objects.select_related('user').order_by('id')[:5])

        for idx, is_customer, ntype, title, msg_body, link in notification_templates:
            if is_customer and idx < len(all_customers):
                target_user = all_customers[idx].user
            elif not is_customer and idx < len(all_freelancers):
                target_user = all_freelancers[idx].user
            else:
                continue

            Notification.objects.get_or_create(
                user=target_user,
                notification_type=ntype,
                title=title,
                defaults={
                    'message': msg_body,
                    'link': link,
                    'is_read': idx % 3 == 0,  # some pre-read
                }
            )

        # ── Phase 6: Simulated Transactions ──────────────────────────────────
        self.stdout.write(self.style.NOTICE("13. Seeding Simulated Transactions (10+ records)..."))
        approved_milestones = list(Milestone.objects.filter(
            status=Milestone.Status.APPROVED
        ).select_related('contract__customer__user', 'contract__freelancer__user', 'contract__project').order_by('id')[:12])

        tx_count = 0
        for ms in approved_milestones:
            tx_obj, created = Transaction.objects.get_or_create(
                contract=ms.contract,
                milestone=ms,
                payer=ms.contract.customer.user,
                recipient=ms.contract.freelancer.user,
                defaults={
                    'amount': ms.amount,
                    'transaction_type': Transaction.TransactionType.MILESTONE_RELEASE,
                    'status': Transaction.Status.COMPLETED,
                    'note': f"Simulated payout release for milestone '{ms.title}'.",
                    'is_simulated': True,
                }
            )
            if created or tx_obj:
                tx_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded FreelanceHub Demo Data:\n"
            f"  - 10 Categories\n"
            f"  - 20 Skills\n"
            f"  - 10 Customer Accounts & Profiles\n"
            f"  - 10 Freelancer Accounts & Profiles\n"
            f"  - 10 Resumes\n"
            f"  - 10 Portfolio Items\n"
            f"  - 10 Open Marketplace Projects\n"
            f"  - 14 Bids & Proposals (Pending, Shortlisted, Accepted, Rejected, Withdrawn)\n"
            f"  - 10 Hired Contracts (Active & Completed)\n"
            f"  - 20 Contract Milestones (Pending, Funded, Submitted, Approved)\n"
            f"  - 10 AI Skill Assessments (8 Verified, 2 Not Passed)\n"
            f"  - 10 Conversations + 30 Messages\n"
            f"  - 10+ Reviews for Completed Contracts\n"
            f"  - 20 Notifications (Mix of Read/Unread)\n"
            f"  - {tx_count} Simulated Transactions (Clearly labelled simulated test data)\n"
            f"Shared Demo Password: {DEMO_PASSWORD}\n"
            f"Demo Domain: {DEMO_DOMAIN}"
        ))
