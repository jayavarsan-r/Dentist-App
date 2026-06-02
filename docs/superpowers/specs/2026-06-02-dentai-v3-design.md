# DentAI V3 — Design Specification
**Date:** 2026-06-02  
**Status:** Ready for implementation  
**Scope:** Clinic architecture, multi-role auth, queue system, role-based dashboards

---

## 1. What This Spec Covers

Evolving DentAI from a single-dentist app into a multi-staff Dental Clinic Operating System. All V4 features (treatment plans, prescriptions, X-rays, multi-notes, case sheet) are preserved and unchanged. This spec only describes what is NEW.

---

## 2. What Is Already Built (Do Not Touch)

- OTP login flow (login.tsx, otp.tsx, auth.controller.js)
- Patient CRUD + search (patients/*)
- Voice → Sarvam → AI note (voice/record, voice/note, ai.controller.js)
- Visit creation + timeline
- Appointments + calendar
- Tooth chart (FDI, interactive)
- Treatment plans, prescriptions, X-rays, multi-notes, case sheet (all V4)
- Follow-up tracking
- Dashboard analytics

---

## 3. New Database Schema

### 3A. New Tables

```sql
-- Clinic entity (top of hierarchy)
CREATE TABLE clinics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  city            TEXT,
  display_id      TEXT UNIQUE,           -- e.g. DENT-CHN-001
  join_code       TEXT UNIQUE NOT NULL,  -- e.g. X7P2K9 (6-char alphanumeric)
  owner_staff_id  UUID,                  -- set after first staff is created
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Staff (replaces dentists table conceptually — dentists migrate here)
CREATE TABLE staff (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  phone       TEXT NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL CHECK (role IN ('doctor', 'receptionist')),
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, phone)
);

-- Queue entries (per-day patient flow)
CREATE TABLE queue_entries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id        UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  patient_id       UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  added_by         UUID REFERENCES staff(id),
  assigned_doctor  UUID REFERENCES staff(id),
  status           TEXT DEFAULT 'waiting'
                   CHECK (status IN ('waiting', 'in_consultation', 'completed', 'skipped')),
  chief_complaint  TEXT,
  visit_reason     TEXT,
  priority         TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  queue_date       DATE DEFAULT CURRENT_DATE,
  token_number     INTEGER,             -- auto-increment within date
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### 3B. Add clinic_id to Existing Tables

```sql
-- All existing records get clinic_id (set via migration from dentist.id)
ALTER TABLE patients      ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id);
ALTER TABLE visits        ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id);
ALTER TABLE appointments  ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id);
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id);
ALTER TABLE visit_notes   ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id);
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id);
ALTER TABLE xrays         ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id);

-- Rename dentist_id → treating_staff_id where applicable (visits, appointments)
-- NOTE: dentist_id stays as-is on patients (created_by), visits (treating doctor)
-- We ADD clinic_id but do not remove dentist_id (backward compat)
```

### 3C. Migration — Existing Dentists

Each existing `dentist` record becomes:
1. A `clinic` record (name = dentist.clinic_name, city = null, join_code = generated)
2. A `staff` record (clinic_id = new clinic.id, phone = dentist.phone, name = dentist.name, role = 'doctor')
3. All patient/visit/appointment records get `clinic_id` set to the new clinic.id

The old `dentists` table stays (for JWT backward compat). Auth middleware maps `dentistId` → `clinic_id` via a lookup.

### 3D. JWT Strategy

Current JWT: `{ dentistId }` → stays for backward compat
New JWT: `{ dentistId, staffId, clinicId, role }` — added fields, not breaking

Existing routes that check `req.dentistId` continue to work. New routes also check `req.clinicId` and `req.role`.

---

## 4. Authentication Flow Redesign

### 4A. First-Time Clinic Setup (new user, no join code)

```
Phone → OTP → verifyOtp returns isNewUser=true
  → "Welcome to DentAI" screen
  → Two options:
      [Create New Clinic]    [Join Existing Clinic]
  
  CREATE NEW CLINIC:
    → Clinic Name (text field)
    → Your Name (text field)
    → City (optional)
    → [Create Clinic]
    → Backend: create clinics row, generate join_code, create staff row (role=doctor)
    → Return { token with staffId+clinicId+role, staff, clinic }
    → Navigate to /home/ (doctor dashboard)
  
  JOIN EXISTING CLINIC:
    → Enter Join Code (6 chars, uppercase)
    → Backend: find clinic by join_code
    → Show clinic name for confirmation
    → Select Role: [Doctor] [Receptionist]
    → Your Name (text field)
    → [Join Clinic]
    → Backend: create staff row linked to clinic
    → Return { token, staff, clinic }
    → Navigate to /home/ (role-appropriate dashboard)
```

### 4B. Returning User

```
Phone → OTP → verifyOtp finds existing staff record
  → Return { token with staffId+clinicId+role, staff, clinic }
  → Navigate directly to /home/
```

### 4C. New API Endpoints for Auth

```
POST /auth/send-otp       (unchanged)
POST /auth/verify-otp     (unchanged — extend response)
POST /auth/create-clinic  (NEW)
POST /auth/join-clinic    (NEW)
GET  /auth/me             (extend to return staff + clinic)
```

---

## 5. New Backend Routes

```
# Queue
GET  /api/queue                  ← today's queue for clinic
POST /api/queue                  ← add patient to queue
PATCH /api/queue/:id             ← update status
DELETE /api/queue/:id            ← remove from queue

# Staff
GET  /api/staff                  ← all staff in clinic
GET  /api/staff/me               ← current staff member

# Clinics
GET  /api/clinic                 ← current clinic info
PATCH /api/clinic                ← update clinic info
```

---

## 6. Middleware Changes

`auth.js` middleware currently sets `req.dentistId`. Extend to also set:
- `req.staffId` (from JWT staffId field)
- `req.clinicId` (from JWT clinicId field)
- `req.role` (from JWT role field)

When JWT only has `dentistId` (old tokens): lookup `dentistId` in `staff` table to get `clinicId` and `role`. Fallback gracefully.

---

## 7. Role-Based Frontend Routing

### Layout changes

`Layout.tsx` reads `role` from auth store. Routes `role=receptionist` users to `/reception/` shell, `role=doctor` to `/home/` shell.

Bottom nav differs per role:

**Doctor nav:** Home (queue) | Patients | Schedule | Calendar | Settings  
**Receptionist nav:** Check-in | Queue | Patients | Schedule | Settings

### Protected routes

Routes like `/voice/note/` are doctor-only. If a receptionist navigates there, redirect to `/reception/`.

---

## 8. New Pages

### 8A. `/onboarding/` — Clinic setup / join

Shown when `isNewUser=true` after OTP. Two-screen flow:
- Screen 1: "Create clinic" vs "Join clinic"  
- Screen 2a: Clinic name + your name + city → Create  
- Screen 2b: Join code input → show clinic name → role picker → your name → Join

### 8B. `/reception/` — Receptionist dashboard

Sections:
1. **Queue strip** — horizontal scroll of today's waiting patients with token numbers. Tap to open patient.
2. **Check-in button** — "+ Check-in Patient" (primary action, top right). Opens patient search → find or create → record complaint (voice) → add to queue.
3. **Today's appointments** — upcoming scheduled appointments for today.
4. **Pending payments** — patients with outstanding balance (from treatment_plans.pending_amount > 0).
5. **Recent patients** — last 5 patients registered today.

### 8C. `/home/` — Doctor dashboard (queue-first)

Replaces current home page entirely. Sections:
1. **Live queue** — full list of today's queue entries with statuses. Tap "In consultation" to open patient → full patient profile.
2. **Stat bar** — Waiting / In consultation / Completed counts.
3. **Today's scheduled** — appointments for today (distinct from walk-in queue).
4. **Pending treatments** — patients with active treatment plans needing next sitting.
5. **Follow-ups due** — same as current follow-up alert.

### 8D. `/check-in/` — Patient check-in (receptionist)

Step 1: Search by phone/name. Results show patient or "Add new patient".  
Step 2: If new → quick create (name, phone, age, gender, allergies).  
Step 3: Record complaint via voice or type (chief complaint field, NOT diagnosis).  
Step 4: Select assigned doctor (if clinic has multiple doctors).  
Step 5: Set priority (normal/urgent).  
Step 6: Confirm → adds to queue → shows token number.

### 8E. `/queue/` — Queue management (both roles, different actions)

Full-screen queue view:
- **Receptionist view**: Can reorder, mark skipped, add notes, see all statuses.
- **Doctor view**: See waiting patients, tap to start consultation (changes status to `in_consultation`), mark complete.

Queue card shows: Token number, patient name, chief complaint, priority badge, assigned doctor, time in queue.

---

## 9. Changes to Existing Pages

### 9A. `patients/[id].tsx`

Add to patient profile header:
- "Add to queue" button (receptionist only)
- "Start consultation" button (doctor only, if patient is in queue)
- Outstanding balance chip (if treatment plans have pending amount)

No tab changes. All existing tabs preserved.

### 9B. `settings.tsx`

Add:
- **Clinic section**: show clinic name, display ID, join code (with copy button)
- **Staff section**: list of clinic staff members (name, role)
- **Role badge** next to user name

### 9C. `appointments/schedule.tsx`

Add doctor selector when scheduling (if clinic has multiple doctors).

---

## 10. AI Extraction Changes

### Multi-doctor extraction

In `ai.controller.js` `buildPrompt()`, add to JSON schema:

```json
"assignedDoctor": "string or null — doctor's name if mentioned (e.g. 'This will be done by Dr Priya')"
```

When `assignedDoctor` is extracted, in `voice/note.tsx`:
- Show a "Assigned to" selector pre-filled with the matched staff name
- User can confirm or change

---

## 11. Component Reuse Plan

| Existing component | V3 usage |
|---|---|
| `AppButton` | All new pages — no changes |
| `StatusBadge` | Add `waiting`, `in_consultation` statuses |
| `PatientAvatar` | Queue cards |
| `EmptyState` | Queue empty, no staff, etc. |
| `AppTextField` | Check-in forms |
| `ToothChart` | Unchanged |
| All V4 pages | Unchanged |
| `authApi` | Extend with clinic/join endpoints |
| `patientsApi` | Switch queries to clinic_id scoping |

---

## 12. New TypeScript Types

```typescript
interface Clinic {
  id: string;
  name: string;
  city: string | null;
  display_id: string;
  join_code: string;
  created_at: string;
}

interface StaffMember {
  id: string;
  clinic_id: string;
  phone: string;
  name: string | null;
  role: 'doctor' | 'receptionist';
  is_active: boolean;
  created_at: string;
}

interface QueueEntry {
  id: string;
  clinic_id: string;
  patient_id: string;
  assigned_doctor: string | null;
  status: 'waiting' | 'in_consultation' | 'completed' | 'skipped';
  chief_complaint: string | null;
  visit_reason: string | null;
  priority: 'normal' | 'urgent';
  queue_date: string;
  token_number: number;
  created_at: string;
  patients?: Pick<Patient, 'id' | 'name' | 'phone' | 'age'>;
  staff?: Pick<StaffMember, 'id' | 'name' | 'role'>;
}
```

---

## 13. Auth Store Changes

```typescript
// Add to authStore:
interface AuthState {
  // existing:
  token, dentist, isAuthenticated, pendingPhone
  // new:
  staff: StaffMember | null;
  clinic: Clinic | null;
  role: 'doctor' | 'receptionist' | null;
  setClinicAuth: (token, staff, clinic) => void;
}
```

---

## 14. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Migrating dentist_id → clinic_id breaks all existing queries | HIGH | Add clinic_id additively; update queries to use clinic_id; keep dentist_id as created_by/treating_doctor |
| Old JWT tokens (dentistId only) stop working | MEDIUM | Middleware falls back to dentist table lookup to get clinicId |
| Receptionist accidentally accesses doctor routes | MEDIUM | Role check in middleware on sensitive routes |
| Queue becomes stale across days | LOW | Filter queue_entries by queue_date = TODAY |
| Existing "dentists" don't have a clinic yet | MEDIUM | Run migration script to auto-create clinic + staff for each dentist |

---

## 15. Implementation Order

**Phase 1 — Foundation (must ship before anything else)**
1. DB migration: create `clinics`, `staff`, `queue_entries`; add `clinic_id` to all tables
2. Migrate existing dentists → clinics + staff
3. Extend JWT + auth middleware (add clinicId, staffId, role)
4. New auth endpoints: `/auth/create-clinic`, `/auth/join-clinic`
5. Onboarding page (first-time setup + join)

**Phase 2 — Role-based UX**
6. Auth store + type updates
7. Role-aware routing in Layout.tsx
8. Doctor home page (queue-first dashboard)
9. Receptionist home page (`/reception/`)
10. Update bottom nav per role

**Phase 3 — Queue**
11. Queue API routes (GET, POST, PATCH)
12. Queue page (`/queue/`)
13. Check-in page (`/check-in/`)
14. Patient profile: add-to-queue / start-consultation buttons

**Phase 4 — Polish**
15. Settings: clinic info, join code, staff list
16. Multi-doctor AI extraction
17. Doctor selector in appointment scheduling
18. Outstanding balance chip on patient profile
