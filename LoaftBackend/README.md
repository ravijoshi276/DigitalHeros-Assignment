# Digital Heroes — Backend (Django REST API)

> Golf performance tracking + charity draws + prize pool engine  
> Built with Django · DRF · Djoser · SimpleJWT · Stripe · PostgreSQL (Supabase)

---

## Table of Contents

1. [Architecture Decisions & Tradeoffs](#architecture-decisions--tradeoffs)
2. [Project Structure](#project-structure)
3. [Tech Stack](#tech-stack)
4. [Data Models & Schema Design](#data-models--schema-design)
5. [API Reference](#api-reference)
6. [Setup & Installation](#setup--installation)
7. [Environment Variables](#environment-variables)
8. [Stripe Integration Guide](#stripe-integration-guide)
9. [Draw Engine Logic](#draw-engine-logic)
10. [Deployment](#deployment)
11. [Testing Checklist](#testing-checklist)

---

## Architecture Decisions & Tradeoffs

### Decision 1 — Monolith over Microservices

| Factor | Monolith (Chosen) | Microservices |
|--------|-------------------|---------------|
| Build speed | ✅ Ship in one day | ❌ Days of infra setup |
| Complexity | ✅ Single deploy | ❌ Service mesh, inter-service auth |
| Scalability | ⚠️ Vertical scale only | ✅ Independent scaling |
| **Verdict** | **Right for MVP** | **V2 consideration** |

### Decision 2 — Admin-Triggered Draws (No Celery)

The PRD explicitly says admins control, simulate, then publish draws. There is no requirement for automated scheduling at v1.

- ✅ **Chosen**: Admin POST to `/draws/{id}/run/` → simulate → `/draws/{id}/publish/`
- ❌ **Deferred**: Celery Beat for automated monthly scheduling (add in v2)
- **Why it matters**: Celery requires Redis/RabbitMQ broker, doubles infra complexity with zero user-facing benefit at MVP.

### Decision 3 — Scores ARE the Draw Numbers

The PRD's "algorithmic draw weighted by score frequency" only makes conceptual sense if users' Stableford scores are their lottery entries. This ties golf performance to prize eligibility.

- Each user's latest 5 scores (range 1–45) are their draw numbers
- Draw engine picks 5 numbers; matches against each subscriber's scores
- **Tradeoff**: Users must have ≥1 score to participate. Handle gracefully.

### Decision 4 — Stripe Hosted Checkout vs Custom Form

- ✅ **Chosen**: Stripe Checkout (hosted page)
- ❌ **Alternative**: Custom Stripe Elements form
- **Why**: Hosted checkout is PCI-compliant with zero extra scope. Saves 3+ hours vs custom form. Minor tradeoff: less control over checkout UI styling.

### Decision 5 — Email as USERNAME_FIELD

Standard for modern SaaS. Djoser supports this with `USER_ID_FIELD = 'id'` and `LOGIN_FIELD = 'email'`.

### Decision 6 — Split Settings (base / development / production)

Prevents secrets from ever landing in version control. Production defaults to `DEBUG=False`, strict ALLOWED_HOSTS, secure cookies.

### Decision 7 — Charity Payouts are Tracked, Not Automated

Actual money transfer to charities would require Stripe Connect or manual bank transfers — out of scope for v1. We track contribution amounts per subscriber per month. Admin generates reports and transfers manually.

---

## Project Structure

```
digital-heroes-backend/
├── manage.py
├── requirements.txt
├── .env                          ← never commit
├── .env.example                  ← safe to commit
├── Procfile                      ← for Railway/Render deploy
│
├── config/
│   ├── __init__.py
│   ├── urls.py                   ← root URL router
│   ├── wsgi.py
│   ├── asgi.py
│   └── settings/
│       ├── __init__.py
│       ├── base.py               ← shared settings
│       ├── development.py        ← local dev overrides
│       └── production.py         ← hardened production settings
│
└── apps/
    ├── __init__.py
    │
    ├── accounts/                 ← Custom user model + Djoser auth
    │   ├── models.py
    │   ├── serializers.py
    │   ├── views.py
    │   ├── urls.py
    │   └── admin.py
    │
    ├── subscriptions/            ← Stripe integration + plan management
    │   ├── models.py
    │   ├── serializers.py
    │   ├── views.py              ← checkout session, webhook, portal
    │   ├── urls.py
    │   └── admin.py
    │
    ├── scores/                   ← Stableford score CRUD + rolling logic
    │   ├── models.py
    │   ├── serializers.py
    │   ├── views.py
    │   ├── urls.py
    │   └── admin.py
    │
    ├── charities/                ← Charity directory + events
    │   ├── models.py
    │   ├── serializers.py
    │   ├── views.py
    │   ├── urls.py
    │   └── admin.py
    │
    ├── draws/                    ← Draw engine + prize pool + entries
    │   ├── models.py
    │   ├── services.py           ← core draw algorithm (isolated, testable)
    │   ├── serializers.py
    │   ├── views.py
    │   ├── urls.py
    │   └── admin.py
    │
    └── winners/                  ← Winner verification + payout tracking
        ├── models.py
        ├── serializers.py
        ├── views.py
        ├── urls.py
        └── admin.py
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Django | 4.2.x (LTS) |
| API | Django REST Framework | 3.15.x |
| Auth | Djoser + SimpleJWT | 2.2.x / 5.3.x |
| Payments | Stripe | 10.x |
| Database | PostgreSQL via Supabase | 15.x |
| ORM adapter | psycopg2-binary | 2.9.x |
| DB URL parser | dj-database-url | 2.x |
| CORS | django-cors-headers | 4.x |
| Filtering | django-filter | 24.x |
| Static files | whitenoise | 6.x |
| Image handling | Pillow | 10.x |
| Server (prod) | gunicorn | 23.x |

---

## Data Models & Schema Design

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│      User        │───1:1─│   Subscription   │──M:1──│    Charity      │
│  (accounts)      │       │  (subscriptions) │       │  (charities)    │
│                  │       │                  │       │                 │
│ id               │       │ id               │       │ id              │
│ email (PK)       │       │ user (FK)        │       │ name            │
│ first_name       │       │ plan             │       │ description     │
│ last_name        │       │ status           │       │ image           │
│ phone            │       │ stripe_cust_id   │       │ is_featured     │
│ is_admin         │       │ stripe_sub_id    │       │ website         │
│ date_joined      │       │ period_start     │       │                 │
└─────────────────┘       │ period_end       │       └─────────────────┘
        │                  │ charity (FK)     │                │
        │                  │ charity_pct      │       ┌────────┴────────┐
        │                  └──────────────────┘       │  CharityEvent   │
        │                                             │ (charities)     │
        │  1:N                                        │                 │
        ▼                                             │ id              │
┌─────────────────┐                                  │ charity (FK)    │
│   GolfScore     │                                  │ title           │
│   (scores)      │                                  │ event_date      │
│                 │                                  └─────────────────┘
│ id              │
│ user (FK)       │       ┌──────────────────┐       ┌─────────────────┐
│ score (1-45)    │       │      Draw        │──1:N──│   PrizeTier     │
│ date (unique)   │       │    (draws)       │       │   (draws)       │
└─────────────────┘       │                  │       │                 │
                          │ id               │       │ tier            │
                          │ month            │       │ pool_amount     │
                          │ year             │       │ rollover_amount │
                          │ draw_type        │       │ winner_count    │
                          │ drawn_numbers[]  │       │ per_winner_amt  │
                          │ status           │       └─────────────────┘
                          │ total_prize_pool │
                          └──────────────────┘
                                  │
                                  │ 1:N
                                  ▼
                          ┌──────────────────┐       ┌─────────────────┐
                          │   DrawEntry      │       │    Winner       │
                          │   (draws)        │       │   (winners)     │
                          │                  │       │                 │
                          │ draw (FK)        │       │ user (FK)       │
                          │ user (FK)        │       │ draw (FK)       │
                          │ numbers[]        │       │ prize_tier (FK) │
                          │ matches          │       │ amount          │
                          │ is_winner        │       │ proof_image     │
                          └──────────────────┘       │ verification    │
                                                      │ payment_status │
                                                      └─────────────────┘
```

---

## API Reference

### Authentication (`/api/auth/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/users/` | None | Register new user |
| POST | `/auth/jwt/create/` | None | Login → returns access + refresh |
| POST | `/auth/jwt/refresh/` | None | Refresh access token |
| GET | `/auth/users/me/` | JWT | Get current user profile |
| PATCH | `/auth/users/me/` | JWT | Update profile |
| POST | `/auth/users/set_password/` | JWT | Change password |

### Subscriptions (`/api/subscriptions/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/subscriptions/create-checkout/` | JWT | Create Stripe Checkout session |
| POST | `/subscriptions/webhook/` | Stripe sig | Handle Stripe events |
| POST | `/subscriptions/portal/` | JWT | Open Stripe customer portal |
| GET | `/subscriptions/status/` | JWT | Get current subscription status |
| PATCH | `/subscriptions/charity/` | JWT | Update charity + percentage |

### Scores (`/api/scores/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/scores/` | JWT + Active sub | List user's scores (newest first) |
| POST | `/scores/` | JWT + Active sub | Add new score (max 5 rolling) |
| PATCH | `/scores/{id}/` | JWT + Active sub | Edit a score |
| DELETE | `/scores/{id}/` | JWT + Active sub | Delete a score |

### Charities (`/api/charities/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/charities/` | None | List all charities (search + filter) |
| GET | `/charities/featured/` | None | Featured charities for homepage |
| GET | `/charities/{id}/` | None | Charity detail + events |
| POST | `/charities/` | Admin | Create charity |
| PATCH | `/charities/{id}/` | Admin | Update charity |
| DELETE | `/charities/{id}/` | Admin | Delete charity |

### Draws (`/api/draws/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/draws/` | JWT | List draws (history) |
| GET | `/draws/{id}/` | JWT | Draw detail + results |
| GET | `/draws/current/` | JWT | Current month's draw info |
| POST | `/draws/` | Admin | Create draw |
| POST | `/draws/{id}/run/` | Admin | Run draw simulation |
| POST | `/draws/{id}/publish/` | Admin | Publish draw results |
| GET | `/draws/{id}/my-entry/` | JWT | User's draw entry and matches |

### Winners (`/api/winners/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/winners/` | Admin | All winners list |
| GET | `/winners/mine/` | JWT | User's won prizes |
| POST | `/winners/{id}/upload-proof/` | JWT | Upload verification screenshot |
| PATCH | `/winners/{id}/verify/` | Admin | Approve/reject proof |
| PATCH | `/winners/{id}/mark-paid/` | Admin | Mark payout complete |

### Admin Analytics (`/api/admin/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin-stats/overview/` | Admin | Users, pool, charity totals |
| GET | `/admin-stats/draw-history/` | Admin | All draw statistics |

---

## Setup & Installation

### Prerequisites

- Python 3.11+
- PostgreSQL (via Supabase — create a free project at supabase.com)
- Stripe account (test mode is fine)
- Git

### 1. Clone and bootstrap

```bash
git clone <your-repo>
cd digital-heroes-backend

python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your actual values (see Environment Variables section)
```

### 3. Database setup

```bash
# Apply migrations
python manage.py migrate

# Create superuser (admin account)
python manage.py createsuperuser

# Load sample charity data (optional)
python manage.py loaddata charities_fixture.json
```

### 4. Stripe products setup

In your Stripe dashboard (test mode):
1. Create Product → "Digital Heroes Monthly" → Recurring price £9.99/month
2. Create Product → "Digital Heroes Yearly" → Recurring price £99.99/year
3. Copy both Price IDs into your `.env`

### 5. Run development server

```bash
export DJANGO_SETTINGS_MODULE=config.settings.development
python manage.py runserver
```

### 6. Stripe webhook (local testing)

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:8000/api/subscriptions/webhook/
# Copy the webhook signing secret → STRIPE_WEBHOOK_SECRET in .env
```

---

## Environment Variables

```env
# Core Django
DEBUG=True
SECRET_KEY=your-50-char-secret-key-here
DJANGO_SETTINGS_MODULE=config.settings.development
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...

# Pricing config
MONTHLY_PLAN_PRICE=9.99
YEARLY_PLAN_PRICE=99.99
PRIZE_POOL_CONTRIBUTION_MONTHLY=6.00   # Per active subscriber per month

# Frontend (CORS)
FRONTEND_URL=http://localhost:5173

# Media (production)
# CLOUDINARY_URL=cloudinary://...
```

---

## Stripe Integration Guide

### Subscription Lifecycle

```
User clicks Subscribe
        │
        ▼
POST /subscriptions/create-checkout/
  → backend creates Stripe CheckoutSession
  → returns { url: "https://checkout.stripe.com/..." }
        │
        ▼
Frontend redirects user to Stripe hosted page
        │
        ▼
User completes payment on Stripe
        │
        ├── Success → redirect to /dashboard?success=true
        └── Cancel  → redirect to /pricing?cancelled=true
        │
        ▼
Stripe fires webhook → POST /subscriptions/webhook/
  Events handled:
  ├── customer.subscription.created  → create Subscription record
  ├── customer.subscription.updated  → sync status, dates
  ├── customer.subscription.deleted  → set status=cancelled
  └── invoice.payment_failed         → set status=past_due
```

### Every Authenticated Request

The `IsActiveSubscriber` permission class checks subscription status on every protected request. Lapsed subscribers get `403 { "detail": "Active subscription required." }`.

---

## Draw Engine Logic

### How Draws Work

```
Admin: POST /draws/  (creates draw for month/year)
            │
Admin: POST /draws/{id}/run/  (simulation)
            │
            ├── Snapshot all active subscribers' latest 5 scores
            ├── Draw 5 numbers from range 1–45
            │    ├── Random mode: pure random.sample(range(1,46), 5)
            │    └── Algorithmic: weighted by score frequency across all users
            │         (more common scores = higher probability = more winners = smaller payout)
            ├── Calculate matches for each subscriber's scores
            ├── Identify winners per tier (3, 4, 5 matches)
            ├── Calculate prize pool from active subscriber count
            │    ├── 40% → 5-match jackpot (+ any rollover from previous unclaimed)
            │    ├── 35% → 4-match
            │    └── 25% → 3-match
            ├── Split each tier equally among winners in that tier
            └── Create DrawEntry + Winner records (status=pending)

Admin: POST /draws/{id}/publish/
            │
            └── Set draw.status = 'published'
                Notify winners (email — v2 feature)
```

### Prize Pool Calculation

```
Monthly prize pool = active_subscriber_count × PRIZE_POOL_CONTRIBUTION_MONTHLY

5-match pool = (40% × total) + rollover_from_previous_unclaimed_jackpot
4-match pool = 35% × total
3-match pool = 25% × total

If multiple winners in same tier → pool splits equally
If 5-match has 0 winners → 5-match pool rolls to next month's jackpot
```

---

## Deployment

### Backend: Railway (recommended) or Render

```bash
# Procfile
web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT

# Required env vars on Railway/Render:
# All from .env.example + DJANGO_SETTINGS_MODULE=config.settings.production
```

```bash
# On first deploy / after model changes:
python manage.py migrate
python manage.py collectstatic --no-input
```

### Database: Supabase

1. Create new Supabase project (not personal/existing — per PRD)
2. Settings → Database → Connection string (URI mode)
3. Set as `DATABASE_URL` in deployment environment

### Stripe Webhooks (Production)

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://your-backend.railway.app/api/subscriptions/webhook/`
3. Events: `customer.subscription.*`, `invoice.payment_failed`, `invoice.payment_succeeded`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET` env var

---

## Testing Checklist

```
Auth & Users
  ☐ Register with email + password
  ☐ Login returns access + refresh tokens
  ☐ Refresh token flow works
  ☐ Protected route rejects no-token request

Subscriptions
  ☐ Create checkout session → Stripe redirect works
  ☐ Stripe webhook updates subscription status
  ☐ Cancelled subscription blocks score entry
  ☐ Customer portal opens correctly
  ☐ Charity selection + percentage update persists

Scores
  ☐ Add 5 scores, 6th replaces oldest
  ☐ Duplicate date is rejected (400)
  ☐ Score out of range 1–45 is rejected (400)
  ☐ Scores return in reverse chronological order
  ☐ Non-subscriber cannot add scores (403)

Charities
  ☐ List all charities with search
  ☐ Featured charities endpoint returns is_featured=True only
  ☐ Admin can create/edit/delete charities
  ☐ Non-admin cannot modify charities (403)

Draws
  ☐ Admin creates draw for month/year
  ☐ Run simulation → DrawEntry created for all active subs
  ☐ Matches calculated correctly
  ☐ Prize pool tiers add up to 100%
  ☐ 5-match jackpot rolls over if no winners
  ☐ Publish sets draw.status = 'published'
  ☐ User can view their own draw entry + matches

Winners
  ☐ Winners created on draw run
  ☐ Winner can upload proof image
  ☐ Admin can approve/reject proof
  ☐ Admin can mark as paid
  ☐ Payment status: pending → paid flow works

Admin Dashboard
  ☐ Overview stats return correct totals
  ☐ User list + subscription management works
  ☐ Draw management: create → run → publish
  ☐ Charity management full CRUD
  ☐ Winner verification queue visible

General
  ☐ Mobile responsive (frontend — check after build)
  ☐ Invalid JWT returns 401 clearly
  ☐ 404s return JSON not HTML
  ☐ All env vars documented
```

---

## Key Design Principles Applied

- **Subscription gating**: `IsActiveSubscriber` permission applied to all score/draw endpoints
- **Score integrity**: `unique_together = ['user', 'date']` at DB level; rolling 5 enforced in `save()`
- **Draw snapshot**: `DrawEntry.numbers` captures scores *at draw time*, not live (scores change)
- **Idempotent webhooks**: Stripe can send duplicate events; use `stripe_subscription_id` as upsert key
- **Rollover safety**: Rollover only applies from the most recently *published* draw with 0 five-match winners
- **Admin control**: Draw `status` progression is one-way: `pending → simulated → published`

---

*Digital Heroes PRD — Backend Implementation · v1.0 · 2026*
