# DentAI V3 — Workflow Amendments
**Date:** 2026-06-02  
**Status:** Implementation-ready  
**Scope:** Workflow corrections based on real clinic observation. Layered ON TOP of v3-design.md. Do not re-read that spec as superseded — all its foundations stay intact.

---

## Amendment Index

| # | Change | Files Affected |
|---|--------|---------------|
| W1 | Doctor Consultation Mode toggle | `home.tsx` |
| W2 | Receptionist complaint = transcript only (no AI) | `check-in.tsx` (already correct) |
| W3 | Receptionist full edit permissions | `patients/[id].tsx`, `check-in.tsx` |
| W4 | Queue reordering for receptionist | `queue/index.tsx`, `queue.routes.js`, DB |
| W5 | Mandatory 6-outcome consultation modal | `consult/[id].tsx`, DB |
| W6 | Reception Action Queue + Checkout | `reception.tsx`, `checkout/[id].tsx` (new) |
| W7 | Distinct Doctor vs Receptionist UI | `home.tsx`, `reception.tsx`, `BottomNav.tsx` |
| W8 | Notification system (polling-based) | `reception.tsx`, `home.tsx` |

---

## W1 — Doctor Consultation Mode

### Problem
Doctor dashboard always shows full navigation. Real clinical use is 90% inside active consultations.

### Solution
Add a Consultation Mode toggle on the doctor home page.

**Normal Mode** (default) — existing home page, no changes.

**Consultation Mode** — replaces home content with a focused treatment-room view:

```
┌─────────────────────────────────────────┐
│  🏥 CONSULTATION MODE              [Exit]│
├─────────────────────────────────────────┤
│                                         │
│  CURRENT PATIENT                        │
│  ┌───────────────────────────────────┐  │
│  │ Jay Olson                   #3    │  │
│  │ Chief complaint: Upper left pain  │  │
│  │ Treatment: RCT ──────── 2/4       │  │
│  │ Last visit: 24 May · Consultation │  │
│  │ Outstanding: ₹3,500               │  │
│  └───────────────────────────────────┘  │
│                                         │
│  DOCTOR ACTIONS                         │
│  [Record Diagnosis]  [View History]     │
│  [View X-Rays]       [Tooth Chart]      │
│  [Generate Rx]       [Mark Complete]    │
│                                         │
│  NEXT PATIENT                           │
│  ┌───────────────────────────────────┐  │
│  │ #4  Priya K.                      │  │
│  │ Tooth sensitivity (3 days)        │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Queue: 2 waiting · 1 done today        │
└─────────────────────────────────────────┘
```

**Bottom nav in Consultation Mode:** hide. Show only inline actions.

### Implementation
- State: `const [consultMode, setConsultMode] = useState(false)` in `home.tsx`
- Toggle button in header (top-right, replaces settings avatar when in mode)
- Consultation Mode view is a full-replacement render branch within the same page
- Persists through same session (no localStorage needed)

---

## W2 — Receptionist Complaint = Transcript Only

### Problem
Chief complaint used AI extraction (Gemini / LLM).

### Solution
Complaint recording = Sarvam STT transcription only. No LLM interpretation.

**Already correct in check-in.tsx** — the flow is:
```
voice → aiApi.transcribe() → setComplaint(transcript)
```
No `generateNote()` is called. ✅

The complaint textarea is editable, so receptionist can also type directly.

**Document the contract clearly:**
- `chief_complaint` field = verbatim patient words
- Doctor diagnosis = structured note from voice/note.tsx (separate)

---

## W3 — Receptionist Permissions

Receptionists must be able to:
- Create/Edit/Search/Delete patients (already permitted)
- Upload X-rays (doctor-only currently — open up)
- Record complaint (already works)
- Add to queue (already works)
- Reorder queue (new — W4)
- Assign doctor (already works on check-in)
- Manage payments (already works)
- Print prescription (allow receptionist to open prescription PDF)
- Schedule appointments (already works)

**Edit patient at any time** — ensure the patient profile edit form is accessible when `role === 'receptionist'`. Currently the edit button may be hidden for receptionist role. Remove that restriction.

---

## W4 — Queue Reordering

### Required DB Migration
```sql
ALTER TABLE queue_entries 
  ADD COLUMN IF NOT EXISTS sort_order FLOAT DEFAULT NULL;

-- After adding: backfill existing rows
UPDATE queue_entries SET sort_order = token_number WHERE sort_order IS NULL;
```

### Queue API changes
**Existing PATCH** — extend to accept `sortOrder`:
```json
PATCH /api/queue/:id
{ "sortOrder": 3.5 }
```

**New endpoint:**
```
PATCH /api/queue/:id/reorder
Body: { "direction": "up" | "down" }
```
Backend swaps `sort_order` with adjacent entry in same clinic/date.

**GET /api/queue** — update `ORDER BY` to `sort_order ASC NULLS LAST, token_number ASC`

### Receptionist Queue Actions (per entry)
```
↑ Move Up   ↓ Move Down   🚨 Urgent   ✕ Skip   👨‍⚕️ Reassign
```

---

## W5 — Mandatory 6-Outcome Consultation Modal

### Problem
Current outcome modal: dismissable, optional, 6 old outcomes with wrong labels.

### Solution
After doctor records treatment voice note (or taps "Done"):
- Show non-dismissable outcome modal
- Doctor MUST select one outcome before queue moves forward
- Each outcome triggers different follow-up action

### Outcome Mapping (DB values → UI labels)

| DB value | UI label | Extra field |
|---|---|---|
| `treatment_done` | Treatment Completed | — |
| `follow_up_scheduled` | Follow-Up Required | `follow_up_days` (7/14/30/custom) |
| `additional_sitting_required` | Additional Sitting Required | `remaining_sittings` (2/3/4/custom) |
| `referred` | Referred To Another Doctor | `referred_to_doctor_id` (staff picker) |
| `diagnosis_only` | Consultation Only | — |
| `treatment_postponed` | Treatment Postponed | `suggested_return_date` (date picker) |

### Outcome Actions (what happens on confirm)

| Outcome | Queue Status After | Reception Task |
|---|---|---|
| Treatment Completed | `ready_for_checkout` | Collect payment + print Rx |
| Follow-Up Required | `ready_for_checkout` | Schedule follow-up + collect payment |
| Additional Sitting Required | `ready_for_checkout` | Schedule next sitting + collect payment |
| Referred To Another Doctor | `completed` | Add to target doctor's queue |
| Consultation Only | `ready_for_checkout` | Collect payment (no Rx) |
| Treatment Postponed | `ready_for_checkout` | Schedule return + collect payment |

### Outcome Metadata
Store extra fields in `outcome_metadata` JSONB column:

```sql
ALTER TABLE queue_entries 
  ADD COLUMN IF NOT EXISTS outcome_metadata JSONB DEFAULT NULL;
```

```json
// Follow-Up Required
{ "follow_up_days": 14 }

// Additional Sitting Required
{ "remaining_sittings": 2 }

// Referred To Another Doctor
{ "referred_to_doctor_id": "uuid", "referred_to_doctor_name": "Dr Priya" }

// Treatment Postponed
{ "suggested_return_date": "2026-07-15" }
```

### Required DB Status Update
```sql
ALTER TABLE queue_entries 
  DROP CONSTRAINT IF EXISTS queue_entries_status_check;

ALTER TABLE queue_entries 
  ADD CONSTRAINT queue_entries_status_check 
  CHECK (status IN ('waiting', 'in_consultation', 'completed', 'skipped', 'ready_for_checkout', 'checked_out'));

-- Add additional_sitting_required to outcomes
ALTER TABLE queue_entries 
  DROP CONSTRAINT IF EXISTS queue_entries_consultation_outcome_check;

ALTER TABLE queue_entries 
  ADD CONSTRAINT queue_entries_consultation_outcome_check 
  CHECK (consultation_outcome IN (
    'diagnosis_only', 'treatment_done', 'treatment_postponed',
    'patient_declined', 'referred', 'follow_up_scheduled',
    'additional_sitting_required'
  ));
```

---

## W6 — Reception Handoff: Action Queue + Checkout

### Reception Action Queue
After doctor marks `ready_for_checkout`, patient disappears from main queue and appears in **Action Queue** on reception dashboard.

**New API endpoint:**
```
GET /api/queue/action-queue
Returns: entries with status='ready_for_checkout' for today, enriched with:
  - patient.name, patient.phone
  - consultation_outcome (translated to readable label)
  - outcome_metadata
  - pending_amount (from treatment_plans)
  - prescription_ready (boolean: any prescription created in last hour)
  - assigned_doctor_staff.name
```

**Reception Action Queue Card:**
```
┌──────────────────────────────────┐
│ #3  Jay Olson                    │
│ Treatment Completed · Dr Kumar   │
│ ─────────────────────────────── │
│ ✓ Collect Payment  ₹3,500 due   │
│ ✓ Print Prescription             │
│ ✓ Confirm Next Appointment       │
│                  [Open Checkout] │
└──────────────────────────────────┘
```

### Reception Checkout Page (`/checkout/[id]`)
Opens when receptionist taps a task card. Shows:

```
Section 1 — Patient & Treatment
  Patient Name, Age, Phone
  Treatment: RCT Tooth 26 (Dr Kumar)
  Consultation outcome: Treatment Completed

Section 2 — Payment
  Estimated Cost:    ₹5,000
  Previously Paid:   ₹1,500
  Amount Due:        ₹3,500
  [ Cash ] [ Card ] [ UPI ]
  Amount field
  [Mark Paid]  [Mark Partial]  [Pending]

Section 3 — Prescription
  [View Prescription]  [Print / Share]

Section 4 — Next Appointment
  (Only shown if outcome requires scheduling)
  Follow-up in 14 days → suggested date
  [Confirm Appointment]

Section 5 — Checkout
  [Complete Checkout]  → sets status='checked_out'
```

---

## W7 — Distinct Doctor vs Receptionist UI

### Doctor Interface: Clinical, Consultation-first
- Dark header with patient context
- Queue as primary content
- Consultation Mode prominently accessible
- No payment/billing UI

### Receptionist Interface: Operational, Task-driven
- White / light header  
- Action Queue prominently above Today's Queue
- Check-in CTA dominant
- Payment / billing actions prominent
- No voice recording / clinical note UI

### Navigation Differences

**Doctor Bottom Nav (Normal Mode):**
```
Home | Patients | Today | Calendar | Settings
```

**Doctor — Consultation Mode:**
No bottom nav (full-screen focus)

**Receptionist Bottom Nav:**
```
Check-in | Queue | Patients | Schedule | Settings
```

---

## W8 — Notification System (Polling-based MVP)

Since the queue already polls every 20–30 seconds, notifications are derived from queue state:

**Doctor → Receptionist:**
- When `ready_for_checkout` count increases, reception sees the new Action Queue task card (auto-refresh)
- No explicit push notification needed for MVP

**Receptionist → Doctor (optional):**
- When a patient's status changes to `checked_out`, the queue count on doctor's home decrements
- Doctor sees patient no longer in today's active queue

**Future enhancement:** Supabase Realtime channels for instant push (schema already supports it).

---

## Migration SQL Summary

Run these in order on Supabase SQL editor:

```sql
-- 1. Add sort_order for queue reordering
ALTER TABLE queue_entries 
  ADD COLUMN IF NOT EXISTS sort_order FLOAT DEFAULT NULL;
UPDATE queue_entries SET sort_order = token_number WHERE sort_order IS NULL;

-- 2. Add outcome_metadata for consultation outcome details
ALTER TABLE queue_entries 
  ADD COLUMN IF NOT EXISTS outcome_metadata JSONB DEFAULT NULL;

-- 3. Update status constraint to include checkout states
ALTER TABLE queue_entries 
  DROP CONSTRAINT IF EXISTS queue_entries_status_check;
ALTER TABLE queue_entries 
  ADD CONSTRAINT queue_entries_status_check 
  CHECK (status IN (
    'waiting', 'in_consultation', 'completed', 'skipped',
    'ready_for_checkout', 'checked_out'
  ));

-- 4. Update consultation_outcome constraint to include additional_sitting_required
ALTER TABLE queue_entries 
  DROP CONSTRAINT IF EXISTS queue_entries_consultation_outcome_check;
ALTER TABLE queue_entries 
  ADD CONSTRAINT queue_entries_consultation_outcome_check 
  CHECK (consultation_outcome IN (
    'diagnosis_only', 'treatment_done', 'treatment_postponed',
    'patient_declined', 'referred', 'follow_up_scheduled',
    'additional_sitting_required'
  ));
```

---

## Affected Components Map

| Component | Change | Priority |
|---|---|---|
| `pages/home.tsx` | Add Consultation Mode toggle + view | HIGH |
| `pages/consult/[id].tsx` | Mandatory 6-outcome modal + metadata + ready_for_checkout | HIGH |
| `pages/reception.tsx` | Add Action Queue section above Today's Queue | HIGH |
| `pages/checkout/[id].tsx` | New — reception checkout screen | HIGH |
| `pages/queue/index.tsx` | Add reorder controls for receptionist | MEDIUM |
| `backend/routes/queue.routes.js` | Add action-queue, reorder, update PATCH | HIGH |
| `types/index.ts` | Update QueueStatus, ConsultationOutcome, add OutcomeMetadata | HIGH |
| `lib/api.ts` | Add queueApi.actionQueue, .reorder, .checkout | HIGH |
| `components/layout/BottomNav.tsx` | No change (already correct per role) | NONE |
| `pages/check-in.tsx` | No change needed (already transcript-only) | NONE |

---

## Queue State Machine (Updated)

```
                    ┌─────────┐
                    │ waiting │
                    └────┬────┘
            ┌────────────┼────────────┐
            ↓            ↓            ↓
     [Doctor: Start]  [Receptionist: Skip]  [Receptionist: Urgent]
            ↓            ↓                       ↓
   ┌────────────────┐  ┌─────────┐         (stays 'waiting',
   │ in_consultation│  │ skipped │          priority='urgent')
   └───────┬────────┘  └─────────┘
           │ [Doctor: Complete + Outcome]
           ↓
   ┌──────────────────────┐
   │   ready_for_checkout │  ← NEW
   └──────────┬───────────┘
              │ [Receptionist: Complete Checkout]
              ↓
   ┌─────────────────┐
   │   checked_out   │  ← NEW
   └─────────────────┘

   Special: referred outcome → 'completed' (not ready_for_checkout)
             + new queue_entry created for target doctor
```
