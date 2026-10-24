# FreelanceHub - AI-Powered Verified Freelance Marketplace

FreelanceHub is a production-grade, full-stack freelance marketplace connecting clients with top-tier technical freelancers whose proficiencies are objectively proven through an automated, server-evaluated **AI Skill Verification Assessment**.

---

## 🛠 Technology Stack

- **Frontend**: React (JavaScript, HTML, Vanilla CSS with custom properties design system). Zero external styling frameworks. Mobile-first responsive layout (320px+).
- **Backend**: Python, Django, Django REST Framework (DRF), `djangorestframework-simplejwt`, `django-cors-headers`.
- **Database**: PostgreSQL (Relational schema, foreign keys, database-level unique constraints, and status fields).
- **Security**: JWT Authentication with access token rotation, refresh token blacklisting, and client-side silent refresh queue.
- **Deployment**: Git, GitHub, Docker, Render.

---

## 📋 Architectural Overview

### 1. System Components
```
[React Browser Client] 
     │ (HTTPS / Bearer JWT)
     ▼
[Django REST API] ────> [PostgreSQL Database]
     │                       (Users, Profiles, Projects, Bids, Milestones,
     │                        Assessments, Contracts, Messages, Reviews)
     ▼
[AI Assessment Service Layer]
     ├── Mock Offline Question Bank (10 curated questions/category)
     └── LLM Integration (Gemini / OpenAI via environment variables)
```

### 2. Eight Main Application Views
1. **Home / Landing Page**: High-impact hero, live platform badges, categories, "How It Works" workflow, sample testimonials, and dual action CTAs.
2. **Authentication Page**: Role-based registration (Freelancer vs Customer), shared login, JWT token issuance, and password reset flow.
3. **Freelancer Dashboard**: Profile metrics, portfolio, resume, AI verification status, active bids, and simulated earnings.
4. **Customer Dashboard**: Post projects, review incoming proposals, shortlist applicants, hire freelancers, and track active milestones.
5. **Project Marketplace Page**: Faceted search and filters (category, skills, budget, experience level, deadline), proposal submissions.
6. **Project Management & Bidding Page**: Full proposal comparison, milestone breakdown, client actions, duplicate bid prevention, and self-bid locking.
7. **AI Skill Verification Page**: Timed, server-graded technical assessments tailored to freelancer skills and resume text.
8. **Communication & Account Page**: Real-time project messaging between clients and hired freelancers, reviews, ratings, and account settings.

---

## 🔐 Credentials & Demo Notice

> **⚠️ DEMO ONLY:**
> All demo accounts use a single shared password. **Never use these credentials or dummy passwords in production!**

- **Shared Demo Password**: `DemoPassword123!`
- **Demo User Domain**: `@demo.freelancehub.test`
- **Sample Accounts**:
  - Customer: `customer.alice@demo.freelancehub.test`
  - Freelancer: `freelancer.bob@demo.freelancehub.test`

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL 14+ running locally on port `5432`

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env

# Configure PostgreSQL credentials in .env:
# DB_NAME=freelancehub_db
# DB_USER=postgres
# DB_PASSWORD=your_password
# DB_HOST=localhost
# DB_PORT=5432

# Apply database migrations
python manage.py makemigrations accounts
python manage.py migrate

# Run automated backend test suite
python manage.py test accounts

# Start Django development server
python manage.py runserver 127.0.0.1:8000
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (Pure React + Vite)
npm install

# Start Vite development server
npm run dev
# Running on http://127.0.0.1:5173/
```

---

## 🔑 Secret Generation & Rotation Guide

### Generating a Strong SECRET_KEY
Run the following in Python:
```python
import secrets
print(secrets.token_urlsafe(50))
```

### Secret Rotation Procedure
1. Generate a new `SECRET_KEY`.
2. Update the environment variables in your `.env` or deployment platform (Render).
3. Restart the backend service. Outstanding JWTs will be invalidated, prompting clients to re-authenticate cleanly via the silent refresh or login prompt.
