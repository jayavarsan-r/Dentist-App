# DentAI — Intelligent Dental Practice Management

> A full-stack mobile application that streamlines dental practice workflows through AI-powered voice documentation, intelligent scheduling, and real-time patient management.

![Platform](https://img.shields.io/badge/Platform-Android-3DDC84?style=flat-square&logo=android)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=flat-square&logo=node.js)
![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-000000?style=flat-square&logo=next.js)
![Database](https://img.shields.io/badge/Database-Supabase%20%2F%20PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Building the APK](#building-the-apk)

---

## Overview

DentAI is a mobile-first practice management platform built for dental professionals. It eliminates manual note-taking through voice-driven AI documentation — a dentist speaks naturally about a procedure and the system transcribes, structures, and stores a complete clinical note automatically. The application is packaged as an Android APK via Capacitor, backed by a production REST API deployed on Render, and persisted in a managed PostgreSQL instance on Supabase.

---

## Features

### Clinical Documentation
- **Voice-to-Note Pipeline** — Record treatment audio; AI transcription and structured note extraction run automatically
- **Editable AI Notes** — Review and correct AI-generated fields (procedure, tooth number, status, medications, next steps) before saving
- **Follow-up Scheduling** — Auto-detected follow-up intent from voice notes triggers appointment creation

### Patient Management
- Full patient profiles with medical history, allergy alerts, and visit timeline
- Real-time search across name and phone number
- Allergy and medical condition warnings prominently surfaced during consultations

### Appointment Scheduling
- Date and time slot picker with live booked-slot awareness
- Edit existing appointments inline
- Mark appointments as Attended, Missed, or Rescheduled in one tap
- Calendar view with appointment density markers

### Dashboard & Analytics
- Today's overview: total appointments, upcoming, completed, pending follow-ups
- Follow-up alert feed with overdue day count
- Quick-action shortcuts for common workflows

### Authentication
- Phone-number OTP login (no passwords)
- JWT-based session with 30-day expiry
- Multi-dentist support — each account is isolated by dentist ID

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Android Device                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Capacitor Runtime (WebView)             │   │
│  │                                                     │   │
│  │   ┌─────────────────────────────────────────────┐  │   │
│  │   │           Next.js 14 (Static Export)        │  │   │
│  │   │                                             │  │   │
│  │   │  Pages         Components       State       │  │   │
│  │   │  ─────         ──────────       ─────       │  │   │
│  │   │  Login         AppButton        Zustand      │  │   │
│  │   │  Dashboard     StatusBadge      Auth Store   │  │   │
│  │   │  Patients      PatientAvatar    TanStack      │  │   │
│  │   │  VoiceRecord   LoadingShimmer   Query Cache  │  │   │
│  │   │  CaseNote      EmptyState                    │  │   │
│  │   │  Calendar      BottomNav                     │  │   │
│  │   │  Followups                                   │  │   │
│  │   │  Settings                                    │  │   │
│  │   └──────────────────────┬──────────────────────┘  │   │
│  │                          │ HTTPS / REST API          │   │
│  └──────────────────────────┼─────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Render Cloud      │
                    │                    │
                    │  ┌──────────────┐  │
                    │  │  Express.js  │  │
                    │  │  REST API    │  │
                    │  │             │  │
                    │  │  /auth      │  │
                    │  │  /patients  │  │
                    │  │  /visits    │  │
                    │  │  /appts     │  │
                    │  │  /ai        │  │
                    │  │  /analytics │  │
                    │  └──────┬──────┘  │
                    └─────────┼──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼───┐   ┌───────▼──────┐  ┌────▼────────────┐
    │  Supabase   │   │  Voice AI    │  │  AI Note Engine │
    │  PostgreSQL │   │  (STT)       │  │  (LLM)          │
    │             │   │              │  │                 │
    │  dentists   │   │  Audio →     │  │  Transcript →   │
    │  patients   │   │  Transcript  │  │  Structured     │
    │  visits     │   │              │  │  Clinical Note  │
    │  appts      │   └──────────────┘  └─────────────────┘
    │  otp_codes  │
    └─────────────┘
```

### Request Flow — Voice-to-Note

```
Dentist speaks
      │
      ▼
MediaRecorder (OGG/MP4)
      │
      ▼
POST /api/ai/transcribe
      │
      ▼
Voice Analysis API ──► Raw transcript text
      │
      ▼
POST /api/ai/generate-note
      │
      ▼
LLM (structured extraction) ──► JSON { procedure, tooth, status, notes, followUpDate }
      │
      ▼
Review & Edit screen
      │
      ▼
POST /api/visits  +  POST /api/appointments (if follow-up detected)
      │
      ▼
Supabase PostgreSQL
```

---

## Tech Stack

### Mobile Client
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (Pages Router, Static Export) |
| Native Runtime | Capacitor 6 |
| Styling | Tailwind CSS 3 |
| State Management | Zustand (auth), TanStack Query (server state) |
| HTTP Client | Axios with JWT interceptor |
| Forms | React Hook Form |
| Animations | Framer Motion |
| Icons | Lucide React |
| Language | TypeScript |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Framework | Express 4 |
| Authentication | JWT (jsonwebtoken), OTP via phone |
| File Uploads | Multer |
| Security | Helmet, express-rate-limit, CORS |
| HTTP Client | Axios |
| Language | JavaScript (CommonJS) |

### Infrastructure
| Service | Purpose |
|---|---|
| Supabase | PostgreSQL database + managed hosting |
| Render | Backend API hosting (auto-deploy from Git) |
| Voice Analysis API | Audio-to-text transcription (Indian English) |
| LLM API | Structured note extraction from transcript |

---

## Project Structure

```
dentist-app/
├── backend/                          # Express REST API
│   ├── src/
│   │   ├── config/
│   │   │   └── supabase.js           # Supabase client initialisation
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verification middleware
│   │   │   └── errorHandler.js       # Global error handler
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── patients.routes.js
│   │   │   ├── visits.routes.js
│   │   │   ├── appointments.routes.js
│   │   │   ├── ai.routes.js
│   │   │   └── analytics.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js    # OTP send/verify, profile
│   │   │   ├── patients.controller.js
│   │   │   ├── visits.controller.js
│   │   │   ├── appointments.controller.js
│   │   │   └── ai.controller.js      # Transcription + note generation
│   │   └── server.js                 # App entry point
│   ├── .env                          # Local environment variables
│   ├── .env.example
│   └── package.json
│
├── frontend/                         # Next.js mobile app
│   ├── src/
│   │   ├── pages/                    # File-based routing
│   │   │   ├── _app.tsx
│   │   │   ├── index.tsx             # Auth redirect
│   │   │   ├── login.tsx
│   │   │   ├── otp.tsx
│   │   │   ├── home.tsx              # Dashboard
│   │   │   ├── patients/
│   │   │   │   ├── index.tsx         # Patient list
│   │   │   │   ├── add.tsx           # Add patient form
│   │   │   │   └── [id].tsx          # Patient profile + history
│   │   │   ├── voice/
│   │   │   │   ├── record.tsx        # Voice recording screen
│   │   │   │   └── note.tsx          # AI case note review
│   │   │   ├── appointments/
│   │   │   │   ├── index.tsx         # Today / Upcoming / Missed tabs
│   │   │   │   └── schedule.tsx      # Appointment scheduler (create + edit)
│   │   │   ├── calendar.tsx
│   │   │   ├── followups.tsx
│   │   │   └── settings.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Layout.tsx        # Auth guard + bottom nav shell
│   │   │   │   └── BottomNav.tsx     # 5-tab navigation bar
│   │   │   └── shared/
│   │   │       ├── AppButton.tsx     # Primary / secondary / ghost / danger
│   │   │       ├── AppTextField.tsx  # Input + search field variants
│   │   │       ├── StatusBadge.tsx   # Appointment and visit status chips
│   │   │       ├── PatientAvatar.tsx # Initials-based avatar
│   │   │       ├── LoadingShimmer.tsx
│   │   │       └── EmptyState.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                # Axios instance + all API helpers
│   │   │   ├── constants.ts          # Base URL, time slots
│   │   │   ├── storage.ts            # localStorage token/dentist helpers
│   │   │   └── utils.ts              # Date, time, string utilities
│   │   ├── store/
│   │   │   └── authStore.ts          # Zustand auth store
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript interfaces
│   │   └── styles/
│   │       └── globals.css           # Tailwind + custom CSS
│   ├── android/                      # Capacitor Android project
│   ├── capacitor.config.ts
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── .env.local
│   └── package.json
│
├── supabase-schema.sql               # Full database schema + indexes
└── README.md
```

---

## API Reference

All protected routes require the header:
```
Authorization: Bearer <jwt_token>
```

### Authentication

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/auth/send-otp` | `{ phone }` | Send OTP to phone number |
| `POST` | `/api/auth/verify-otp` | `{ phone, otp }` | Verify OTP, receive JWT |
| `GET` | `/api/auth/me` | — | Get current dentist profile |
| `PUT` | `/api/auth/profile` | `{ name, clinic_name }` | Update profile |

### Patients

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/patients` | List all patients (supports `?q=` search) |
| `POST` | `/api/patients` | Create patient |
| `GET` | `/api/patients/:id` | Get patient with full visit + appointment history |
| `PUT` | `/api/patients/:id` | Update patient |
| `DELETE` | `/api/patients/:id` | Soft-delete patient |

### Visits

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/visits` | List visits (supports `?patientId=`) |
| `POST` | `/api/visits` | Create visit record |
| `GET` | `/api/visits/:id` | Get single visit |
| `PUT` | `/api/visits/:id` | Update visit (mark follow-up done, edit notes) |

### Appointments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/appointments` | List appointments (supports `?date=YYYY-MM-DD`) |
| `GET` | `/api/appointments/today` | Today's appointments with patient data |
| `GET` | `/api/appointments/upcoming` | Next 7 days |
| `GET` | `/api/appointments/booked-slots` | Booked time slots for a date (`?date=`) |
| `POST` | `/api/appointments` | Create appointment |
| `PUT` | `/api/appointments/:id` | Update status, reschedule |

### AI

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/ai/transcribe` | `multipart: audio file` | Convert audio to transcript |
| `POST` | `/api/ai/generate-note` | `{ transcript }` | Extract structured clinical note from transcript |

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/dashboard` | Today's stats + overdue follow-ups |

---

## Database Schema

```sql
dentists        — Practice accounts (one per phone number)
patients        — Patient records linked to a dentist
visits          — Clinical notes per patient visit
appointments    — Scheduled slots per patient
otp_codes       — Time-bound OTP records (10-minute TTL)
```

Key design decisions:
- **Row isolation by `dentist_id`** — every query filters by the authenticated dentist; no cross-account data leakage
- **Soft deletes on patients** — `is_deleted = true` preserves visit history
- **Follow-up tracking on visits** — `follow_up_date` + `follow_up_done` drives the alerts system
- **Partial indexes** — `idx_visits_followup` only indexes rows where `follow_up_date IS NOT NULL AND follow_up_done = FALSE`, keeping alert queries fast

---

## Getting Started

### Prerequisites

- Node.js 18+
- Android Studio (for APK builds) or a physical Android device
- Supabase project
- Render account (for deployment)

### 1. Clone and install

```bash
git clone <repo-url>
cd dentist-app

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET, etc.
```

### 3. Initialise the database

Run `supabase-schema.sql` in your Supabase project:
**Supabase Dashboard → SQL Editor → New query → paste → Run**

### 4. Run locally

```bash
# Terminal 1 — Backend
cd backend && npm start

# Terminal 2 — Frontend
cd frontend && npm run dev -- --port 3001
```

Open `http://localhost:3001` in your browser.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `JWT_SECRET` | 64-character random secret for signing tokens |
| `SARVAM_API_KEY` | Voice analysis API key |
| `GEMINI_API_KEY` | LLM API key for note extraction |
| `DEV_OTP` | Fixed OTP for development (`123456`) |
| `USE_DEV_OTP` | Set `true` to bypass SMS in development |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |

---

## Deployment

### Backend — Render

1. Push `backend/` to a GitHub repository
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set root directory to `backend/`
4. Configure:

| Field | Value |
|---|---|
| Build Command | `npm install` |
| Start Command | `node src/server.js` |

5. Add all environment variables from `backend/.env` in the Render dashboard
6. Deploy — Render auto-deploys on every push to `main`

### Frontend

The frontend is a static export bundled into the Android APK via Capacitor. No separate hosting is required.

---

## Building the APK

```bash
cd frontend

# 1. Set production API URL in .env.local
echo "NEXT_PUBLIC_API_URL=https://your-app.onrender.com/api" > .env.local

# 2. Build static export
npm run build

# 3. Sync to Android project
npx cap sync android

# 4. Build debug APK
cd android && ./gradlew assembleDebug
```

Output: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

**Install on device:**
1. Transfer APK via USB, AirDrop, or Google Drive
2. Enable **Install from unknown sources** in Android Settings → Security
3. Tap the APK to install

---

## Security Considerations

- All API routes (except `/auth/send-otp` and `/auth/verify-otp`) require a valid JWT
- JWTs expire after 30 days and are verified server-side on every request
- The backend uses the Supabase **service role key** — this key is never exposed to the client
- Rate limiting is applied to all `/api/` routes (100 requests per 15 minutes per IP)
- Helmet.js sets secure HTTP headers on every response
- OTP codes expire after 10 minutes and are marked as used after a single successful verification
- Patient data is scoped to `dentist_id` at the query level — no row-level policy dependency

---

## License

MIT © 2026 DentAI
