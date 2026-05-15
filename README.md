# Tableaux — Restaurant Management Platform

A multi-tenant SaaS platform for restaurants, built for the Tajikistan market (TJS currency, `Asia/Dushanbe` timezone). Covers the full operational stack: point-of-sale, kitchen display, analytics, inventory, staff management, and a waiter Android app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | Django 5, Django REST Framework, PostgreSQL, Redis, Celery |
| **Auth** | SimpleJWT — email-based, 60-min access / 7-day refresh tokens |
| **Web frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| **Android app** | Kotlin, Jetpack Compose, Material 3, Retrofit2 |
| **Infrastructure** | Docker, Nginx, Gunicorn |
| **Async tasks** | Celery + Redis (Telegram notifications, report generation) |
| **API docs** | Swagger UI at `/api/docs/` · ReDoc at `/api/redoc/` |

---

## Project Structure

```
tableaux/
├── apps/                     # Django applications
│   ├── core/                 # BaseModel (UUID PK), SoftDeleteMixin, AuditLog
│   ├── users/                # Organization → Branch → Membership RBAC, custom User
│   ├── catalog/              # Categories, MenuItems, Variants, Modifiers, Allergens
│   ├── orders/               # Order lifecycle + inventory deduction
│   ├── kitchen/              # Kitchen Display System (KDS) views
│   ├── shifts/               # Cash register shift open/close
│   ├── inventory/            # Ingredients, StockBalance, PurchaseOrders
│   ├── analytics/            # Dashboard — revenue, top items, staff stats, food cost
│   └── qr/                   # QR code tokens for table/pickup self-ordering
│
├── config/                   # Django settings (base / dev / prod), URLs, Celery
├── nginx/                    # Nginx Dockerfile + config
├── frontend-app/             # Next.js manager dashboard (TypeScript)
│   └── src/
│       ├── app/              # App Router pages (dashboard, pos, kitchen, orders, settings, staff)
│       ├── components/       # Layout, POS, KDS, Settings, UI components
│       ├── lib/              # axios API client, AppDataContext
│       ├── hooks/            # usePageRefresh, useInterval
│       └── types/            # Shared TypeScript types mirroring backend serializers
│
├── Waiter/                   # Android waiter app (Kotlin + Jetpack Compose)
│   └── app/src/main/java/com/example/waiter/
│       ├── ui/screen/        # Login, BranchPicker, Menu, Tables, Orders screens
│       ├── viewmodel/        # AuthViewModel, WaiterViewModel (MVVM + StateFlow)
│       ├── network/          # Retrofit ApiService, ApiClient, ApiModels
│       └── data/             # SessionManager (DataStore)
│
├── frontend/                 # Static UI mockups (reference only)
├── docker-compose.prod.yml   # Production stack (web + db + nginx + redis + worker)
├── Dockerfile                # Django production image
└── requirements.txt          # Python dependencies
```

---

## Multi-tenant Architecture

```
Organization  (restaurant chain / holding)
    └── Branch  (individual location)
            ├── Membership  (User → Role in this org)
            ├── Table       (floor plan, status)
            ├── BranchMenuItem  (per-branch price overrides)
            └── WorkShift   (cash register session)
```

Roles: `OWNER` · `REGIONAL` · `BRANCH_MAN` · `ACCOUNTANT` · `WAITER` · `CHEF`

---

## Web Frontend — Key Screens

| Screen | Route | Who uses it |
|---|---|---|
| Analytics Dashboard | `/dashboard` | Owner / Manager |
| POS / Cash Register | `/pos` | Waiter / Cashier |
| Kitchen Display (KDS) | `/kitchen` | Chef |
| Orders List | `/orders` | Manager |
| Settings | `/settings` | Manager |
| Staff Management | `/staff` | Owner / Manager |

---

## Android App — Waiter Screens

| Screen | Purpose |
|---|---|
| Login | Email + password → JWT |
| Branch Picker | Select branch (if multi-branch user) |
| Menu | Browse categories, add to cart with variants + modifiers |
| Tables | Floor plan, select table for dine-in |
| Orders | View active orders, mark as served |

---

## Local Development

### Backend

```bash
cd /path/to/tableaux
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in DB and secret key
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
cd frontend-app
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_DEFAULT_BRANCH_ID
npm run dev
```

### Android

Open `Waiter/` in Android Studio. Change `ApiClient.BASE_URL` in `network/ApiClient.kt` to your server IP for physical device testing.

---

## Production (Docker)

```bash
cp .env.example .env    # fill all values
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate
docker-compose -f docker-compose.prod.yml exec web python manage.py collectstatic --no-input
```

API docs available at `http://your-server/api/docs/`
