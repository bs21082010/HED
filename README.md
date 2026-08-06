# Digital Dormitory Discipline & Alert System

Interactive dormitory monitoring for Sainik School. Each cadet's bed is a tile on
a dashboard. Supervisors click a bed to issue discipline alerts; red alerts
auto-assign Extra Drill (ED) and fire SMS notifications.

## Features

- **Single click** → Yellow warning (improper layout, untidy uniform) — timestamped log
- **Double click** → Red alert — auto-assigns ED, logs it, and sends SMS to supervisors/drill instructors/admins
- **Color-coded dashboard**: Green = Normal · Yellow = Warning · Red = ED
- **Real-time updates** (dashboard polls every 5s)
- **SMS gateway**: pluggable — `mock` (dev) or `twilio` (production)

## Stack

| Layer    | Tech                                            |
|----------|-------------------------------------------------|
| Frontend | Next.js 15 + React 19 + Tailwind CSS            |
| Backend  | FastAPI + SQLAlchemy                            |
| Database | PostgreSQL (SQLite fallback for local dev)      |
| SMS      | Twilio (TextLocal/MSG91 can be swapped into `app/services/sms.py`) |
| Deploy   | Docker Compose                                  |

## Project layout

```
dorm-alert-system/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + CORS + startup
│   │   ├── models.py        # House, Dorm, Bed, Cadet, Alert, EdAssignment, Contact
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── seed.py          # Sample data (houses, dorms, cadets, contacts)
│   │   ├── routers/         # dorms, cadets, alerts, ed, contacts
│   │   └── services/sms.py  # Mock + Twilio providers
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Bed, DormGrid, AlertPanel, EdPanel, ToastHost
│   └── lib/api.ts           # Typed API client
├── docker-compose.yml
└── .env.example
```

## Run locally (no Docker required)

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
python -m app.seed                               # seed sample data
uvicorn app.main:app --reload                    # http://localhost:8000/docs
```

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev                                      # http://localhost:3000
```

Open http://localhost:3000, pick a dorm, then click (yellow) or double-click
(red) a cadet's bed. Red alerts write SMS messages to `backend/sms_outbox.log`
with the mock provider.

## Run with Docker

```bash
docker compose up --build
# backend  -> http://localhost:8000/docs
# frontend -> http://localhost:3000
```

## API overview

| Method | Path                          | Purpose                                   |
|--------|-------------------------------|-------------------------------------------|
| GET    | `/api/dorms`                  | List dormitories                          |
| GET    | `/api/dorms/{id}`             | Dorm map: beds + cadets + current status  |
| POST   | `/api/beds/{bed_id}/alerts`   | Raise alert `{type: warning\|red}` → red also creates ED + SMS |
| GET    | `/api/alerts?dorm_id=&limit=` | Alert history                            |
| POST   | `/api/alerts/{id}/resolve`    | Mark alert resolved                       |
| GET    | `/api/ed`                     | Extra Drill schedule                      |
| GET/POST | `/api/contacts`             | SMS recipients                            |
| GET    | `/api/health`                 | Health check                              |

## SMS configuration

In `backend/.env`:

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
SMS_NOTIFY_ROLES=supervisor,drill_instructor,admin
```

SMS recipients are stored in the `contacts` table (see `/api/contacts`).
To swap in TextLocal/MSG91, implement a new provider class in
`backend/app/services/sms.py` following `SmsProvider`.

## Security notes

- The system currently has no authentication. Before real deployment, add
  auth (e.g. Supabase Auth / Keycloak / OIDC) so only supervisors can POST alerts.
- Phone numbers are personal data — keep the database private.
