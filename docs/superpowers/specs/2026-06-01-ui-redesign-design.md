# DentAI V3 — Complete UI Redesign Spec

**Date:** 2026-06-01
**Scope:** Pure UI/UX rewire. Zero changes to API calls, data fetching logic, Supabase queries, or backend. All existing hooks, providers, and API wiring stay exactly as-is.
**Stack:** Next.js 14 (Pages Router, static export) + Capacitor + Tailwind CSS

---

## 1. Design Principles

- **Warm minimal** — white backgrounds, stone text, no cold blues
- **Calm clinical** — feels like a premium private clinic, not hospital ERP
- **Data-first** — information hierarchy over decoration
- **Touch-optimised** — all interactive targets ≥ 44px, drag targets large enough for fingers

---

## 2. Color System (Full Tailwind Config Replacement)

Replace the entire `colors` block in `tailwind.config.js`. Every component references these tokens — no hardcoded hex values anywhere in components.

```js
colors: {
  // ── BACKGROUNDS ──
  bg:      '#FFFFFF',   // app-wide background
  surface: '#FFFFFF',   // cards, modals, nav
  'surface-subtle': '#FAFAF8',  // alternate rows, input fill
  'surface-muted':  '#F4F3F0',  // chips, section labels, skeleton

  // ── ACCENT — Sage Green (primary brand) ──
  accent: {
    DEFAULT: '#5F7A61',   // buttons, active tabs, selected states
    dark:    '#49614B',   // pressed
    light:   '#EDF4EE',   // chip bg, focus ring fill
    subtle:  '#F4F8F4',   // hover bg on rows
  },

  // ── HIGHLIGHT — Amber (pending / upcoming / attention) ──
  amber: {
    DEFAULT: '#D97706',
    dark:    '#B45309',
    light:   '#FEF3C7',
    border:  '#FDE68A',
  },

  // ── SEMANTIC ──
  success: { DEFAULT: '#16A34A', light: '#DCFCE7', border: '#86EFAC' },
  warning: { DEFAULT: '#CA8A04', light: '#FEF9C3', border: '#FDE047' },
  error:   { DEFAULT: '#DC2626', light: '#FEE2E2', border: '#FCA5A5' },
  info:    { DEFAULT: '#0891B2', light: '#E0F2FE', border: '#67E8F9' },

  // ── TEXT ──
  text: {
    primary:   '#1C1917',  // stone-900
    secondary: '#78716C',  // stone-500
    disabled:  '#A8A29E',  // stone-400
    inverse:   '#FFFFFF',
  },

  // ── BORDERS ──
  border:  '#E7E5E4',   // stone-200
  divider: '#F5F5F4',   // stone-100
}
```

**Tooth chart fill colours (used only in ToothChart component):**

| Status | Fill | Border |
|---|---|---|
| healthy | `#E8E5E1` | `#D4D0CB` |
| completed | `#C8D9C8` | `#5F7A61` |
| in_progress | `#5F7A61` | `#49614B` |
| upcoming / scheduled | `#FEF3C7` | `#FDE68A` |
| needs_attention | `#FEE2E2` | `#FCA5A5` |

---

## 3. Typography

No font change — keep Inter. Update weight/size usage to match warm minimal feel:
- Headings: `font-semibold` (not bold) where currently bold, keep bold only for hero numbers
- Labels: `text-text-secondary` uppercase tracking — keep as-is
- Body: `text-text-primary` — same

---

## 4. Shared Components to Update

These components exist and need colour token updates only (no structural changes):

| Component | Change |
|---|---|
| `AppButton` | `bg-accent` replaces `bg-primary`, `bg-accent-light` replaces `bg-primary-surface` |
| `StatusBadge` | completed→success, scheduled→amber, missed→error, in_progress→info |
| `PatientAvatar` | `bg-accent-light text-accent` replaces primary surface/text |
| `BottomNav` | selected item: `text-accent`, active icon fill: `bg-accent-light/30` |
| `LoadingShimmer` | `bg-surface-muted` shimmer base |

---

## 5. Home Page (`pages/home.tsx`)

### 5.1 Header (replaces gradient hero)

```
┌─────────────────────────────────────────────────────┐
│  Mon, 1 Jun 2026                         [avatar]   │
│  Good morning, Dr. {name}                           │
└─────────────────────────────────────────────────────┘
```

- White bg, `border-b border-divider`
- Date: `text-xs text-text-secondary`, Doctor name: `text-xl font-semibold text-text-primary`
- Avatar: 36px circle, initials, `bg-accent-light text-accent` — taps to `/settings/`
- No gradient, no bell icon

### 5.2 Stats Strip (replaces 2×2 grid)

Horizontal scrollable row of 4 stat cards, each `~160px wide × 72px tall`:

```
[ 📅  12  Today's ] [ ⏳  5  Upcoming ] [ ✓  7  Done ] [ ⚠  3  Follow-ups ]
```

Card anatomy:
- White bg, `border border-border rounded-xl shadow-sm`
- Icon (18px) + large number (`text-2xl font-bold`) + label (`text-xs text-text-secondary`)
- Icon colours: Today→accent, Upcoming→amber, Done→success, Follow-ups→error
- `flex-shrink-0`, horizontal `ScrollView`-style with `overflow-x-auto`

### 5.3 Search Bar

Full-width, below stats, `mt-4`:
```
🔍  Search patients by name or phone...
```
- `bg-surface-subtle rounded-full` (pill shape)
- Tapping navigates to `/patients/` with search auto-focused
- NOT a functional search on home — just a navigation shortcut

### 5.4 Today's Patients

Section header: `"Today's Patients"` + `"See All →"` (navigates to `/appointments/`)

Card list — same data as before, restyled:
- White card, `border-l-4 border-l-accent` for scheduled appointments
- `border-l-4 border-l-success` for completed
- Time (accent text) · Patient name · Purpose · Status badge
- Mark-attended green checkmark stays

### 5.5 Follow-ups / Recent Appointments

Single combined section at the bottom.
- If follow-ups exist: show "Follow-up Alerts" list (red left border)
- Then "Recent Appointments" below (last 5, stone styling)
- No FAB. No Quick Actions. No separate sections with divider headers.

---

## 6. Patients List Page (`pages/patients/index.tsx`)

### 6.1 Layout

Keep existing structure (search bar, filter chips, list). Add A–Z index bar.

### 6.2 A–Z Index Bar

```
┌──────────────────────────────────┬────┐
│ Patient list                     │ A  │
│                                  │ B  │
│  A ─────────────────────────     │ C← │ ← tapping C jumps to C section
│   Arun Kumar · Last: 2d ago      │ D  │
│   Arya Patel · Last: Today       │ E  │
│                                  │ ·  │
│  J ─────────────────────────     │ J← │ ← highlighted (current scroll position)
│   Jayavarsan · Last: Today       │ ·  │
│                                  │ Z  │
└──────────────────────────────────┴────┘
```

- Right strip: `16px wide`, letters stacked vertically, `text-[10px] font-medium`
- Active letter (current scroll section): `text-accent font-bold`
- Tap letter: `scrollIntoView` on the section header element
- Section headers: `text-xs font-semibold text-text-secondary uppercase px-5 py-2 bg-surface-subtle`
- Patients sorted alphabetically, grouped by first letter of name

---

## 7. Patient Detail Page (`pages/patients/[id].tsx`)

### 7.1 Header (replaces gradient hero)

```
┌─────────────────────────────────────────────────────┐
│ ←   Jayavarsan                    📞   [Current]   │
│     Male · 14 yrs · 9025496316                      │
│     ⚠ Allergic to: Penicillin  (only if allergies) │
└─────────────────────────────────────────────────────┘
```

- White background, `border-b border-border`
- Name: `text-xl font-semibold text-text-primary`
- Phone icon: taps `tel:` link, `text-accent`
- Status badge (pill):
  - **New** — `bg-info-light text-info` — no completed visit yet
  - **Current** — `bg-accent-light text-accent` — has upcoming scheduled appointment
  - **Old** — `bg-surface-muted text-text-secondary` — last appt >6 months, no upcoming
- Allergy strip: `bg-error-light border-l-4 border-l-error text-error text-xs px-4 py-2`

### 7.2 Tabs

4 tabs in a row below header:

```
[ Overview ] [ History ] [ Complications ] [ Teeth ]
```

Active tab: `border-b-2 border-accent text-accent`
Inactive: `text-text-secondary`

### 7.3 Overview Tab

Sections in order:

**AI Patient Summary Card** (top of Overview, always visible)

A single card rendered at the very top of the Overview tab. Gives the dentist a 2-second snapshot without scrolling. Computed entirely from existing patient data — no new API call.

```
┌─────────────────────────────────────────────────┐
│  ✦ Patient Summary                              │
│ ─────────────────────────────────────────────── │
│  Last Visit      Root Canal · Tooth 26          │
│                  Completed · 31 May 2026        │
│ ─────────────────────────────────────────────── │
│  Pending         Permanent Crown Placement      │
│                  (from next_steps of last visit)│
│ ─────────────────────────────────────────────── │
│  Next Appt       10 Jun 2026 · 10:00 AM         │
│ ─────────────────────────────────────────────── │
│  Total Billed    ₹4,500          (if > 0 only)  │
└─────────────────────────────────────────────────┘
```

Card styling: `bg-accent-light border border-accent/30 rounded-xl px-4 py-4`
Header row: small sparkle icon (`✦`) + "Patient Summary" label in `text-xs font-semibold text-accent uppercase tracking-wide`
Each row: `text-xs text-text-secondary` label left · `text-sm font-medium text-text-primary` value right
Dividers: `border-t border-accent/10`

Data sources (all from existing patient query — zero extra API calls):
- **Last Visit** → `visits` sorted by `visit_date DESC`, first result's `procedure_name` + `tooth_number` + `status` + `visit_date`
- **Pending** → last visit's `next_steps` field (if not null). If null, hide this row entirely
- **Next Appointment** → `appointments` filtered to `status === 'scheduled'` and `appointment_date >= today`, sorted ascending, first result's `appointment_date` + `appointment_time`
- **Total Billed** → sum of all `visit.cost` values. **Only render this row if total > 0**

If patient has no visits yet: show a single-row empty state inside the card: `"No visits recorded yet — record the first visit to see a summary"` in `text-sm text-text-secondary italic`.

**Diagnosis** (from latest voice transcript)
- Card with label "DIAGNOSIS" + raw transcript summary from last visit's `raw_transcript`
- If none: empty state "No diagnosis recorded yet"

**Current Treatment**
- Most recent `in_progress` or latest visit's procedure + tooth + status
- Shows: procedure name, tooth number chip, status badge, date

**Treatment History**
- Same visit timeline cards as existing — procedure, date, notes, cost
- All visits, reverse chronological

**Appointments** (only upcoming/scheduled ones)
- Compact list: date + time + purpose
- Edit and Mark-Attended buttons

### 7.4 History Tab

All appointments (past + upcoming) in reverse chronological order.

Each row:
- Date block (day + month) · Patient arrived/missed/upcoming badge
- Purpose / procedure done
- If visit exists for that date: show procedure name + cost

No treatment history here — appointments only.

### 7.5 Complications Tab

Sections:

**Medical Conditions** — free text display, edit icon
**Allergies** — red warning strip display, edit icon
**Notes** — free text area, editable inline (saves via `PUT /api/patients/:id`)
**Clinical Flags** — 4 toggle chips:
```
[ 🩸 Blood Thinner ]  [ 💉 Diabetes ]  [ ❤️ Heart Condition ]  [ 🤰 Pregnancy ]
```
Active flag: `bg-error-light border-error text-error`
Inactive: `bg-surface-muted text-text-secondary border-border`

Flags saved as JSON in a new `clinical_flags` field (add to patient update API call body — backend already accepts arbitrary fields in `PUT /api/patients/:id`).

### 7.6 Teeth Tab

Full anatomical SVG chart (see Section 8) + bottom drawer on tooth tap.

---

## 8. Tooth Chart — Anatomical SVG

### 8.1 Component: `ToothChart.tsx` (full rewrite)

Render two jaw arches as SVG. Each tooth is a hand-crafted SVG path:
- **Incisors (11,12,21,22,31,32,41,42):** narrow, tall, slightly rounded crown
- **Canines (13,23,33,43):** narrow, pointed crown tip
- **Premolars (14,15,24,25,34,35,44,45):** medium width, slight cusp
- **Molars (16,17,26,27,36,37,46,47):** wide, flat top with 2 cusps
- **Wisdom teeth (18,28,38,48):** slightly smaller molars

Each tooth SVG path: `fill` driven by status colour, `stroke` driven by border colour, `stroke-width="1.5"`, hover/tap scales to `1.1` via CSS transform.

Layout: two `<svg>` elements (upper jaw, lower jaw), each ~`320px wide × 80px tall`. FDI numbers rendered as small `<text>` elements below each tooth.

### 8.2 Status Colour Mapping

| Status | Fill | Stroke |
|---|---|---|
| healthy | `#E8E5E1` | `#D4D0CB` |
| completed | `#C8D9C8` | `#5F7A61` |
| in_progress | `#5F7A61` | `#49614B` |
| upcoming | `#FEF3C7` | `#FDE68A` |
| needs_attention | `#FEE2E2` | `#FCA5A5` |

### 8.3 Bottom Drawer on Tooth Tap

Slide-up panel from bottom, `60% screen height`. Shows:
- Tooth number + anatomical name (e.g. "Tooth 26 — Upper Left 1st Molar")
- Status pill
- Procedures list (date · procedure · cost)
- Upcoming appointment if any
- Total cost for this tooth

Same data as existing `ToothDetailSheet.tsx` — just restyled with warm palette.

---

## 9. Schedule Page (`pages/appointments/schedule.tsx`)

### 9.1 View Toggle

Top of page, pill toggle:
```
  [ Day ]  [ Week ]
```
Active: `bg-accent text-white rounded-full px-4 py-1.5`
Inactive: `text-text-secondary`

### 9.2 Day View

Vertical time column, 08:00–20:00, 30-min rows (48 rows total).
- Time labels: left column, `text-xs text-text-secondary`, `40px wide`
- Appointment blocks: coloured rectangles spanning their duration
  - `bg-accent-light border-l-4 border-accent rounded-r-lg`
  - Patient name + purpose inside block
- Empty slots: subtle `border-b border-divider` lines
- Drag up/down: uses `@dnd-kit/core` `useDraggable` + `useDroppable`
- On drop: calls `appointmentsApi.update(id, { appointment_time: newTime })`

### 9.3 Week View

7-column grid × time rows.
- Day headers: `Mon 1`, `Tue 2`… Today column: `bg-accent-light/20`
- Appointment blocks: same styling as day view, draggable across columns (days) and rows (times)
- On drop: calls `appointmentsApi.update(id, { appointment_date: newDate, appointment_time: newTime })`

### 9.4 Interaction Details

- **Drag ghost:** semi-transparent clone of the appointment block follows cursor/finger
- **Drop zone highlight:** slot turns `bg-accent-light border border-accent` when hovered during drag
- **Snap:** appointments snap to nearest 30-min slot
- **Tap empty slot:** opens existing appointment scheduler modal (existing `/appointments/schedule` form)
- **Tap existing block:** opens edit mode for that appointment

### 9.5 Library

Add to `package.json`:
```json
"@dnd-kit/core": "^6.1.0",
"@dnd-kit/utilities": "^3.2.2"
```

---

## 10. Files to Create / Modify

### New files
- `frontend/src/components/shared/ToothChartSVG.tsx` — full SVG anatomical chart (replaces grid-based `ToothChart.tsx`)
- `frontend/src/components/schedule/DayView.tsx` — day view calendar with dnd-kit
- `frontend/src/components/schedule/WeekView.tsx` — week view calendar with dnd-kit

### Modified files
- `tailwind.config.js` — full color token replacement
- `frontend/src/styles/globals.css` — update any hardcoded colour references
- `frontend/src/pages/home.tsx` — full layout rewrite (logic hooks unchanged)
- `frontend/src/pages/patients/index.tsx` — add A–Z index bar (data hooks unchanged)
- `frontend/src/pages/patients/[id].tsx` — new 4-tab structure + AI summary card at top of Overview (all API calls unchanged)
- `frontend/src/pages/appointments/schedule.tsx` — replace with day/week dnd calendar
- `frontend/src/components/shared/AppButton.tsx` — accent colours
- `frontend/src/components/shared/StatusBadge.tsx` — warm palette
- `frontend/src/components/shared/PatientAvatar.tsx` — accent colours
- `frontend/src/components/shared/ToothChart.tsx` — replace with SVG version
- `frontend/src/components/shared/ToothDetailSheet.tsx` — warm palette restyling
- `frontend/src/components/layout/BottomNav.tsx` — accent active state

### Zero-touch files (functionality — do not modify)
- All files in `frontend/src/lib/` (api.ts, storage.ts, utils.ts, constants.ts)
- All files in `frontend/src/store/`
- All files in `frontend/src/types/`
- All files in `backend/`
- `frontend/src/pages/login.tsx`, `otp.tsx`, `voice/record.tsx`, `voice/note.tsx`
- `frontend/src/pages/calendar.tsx`, `followups.tsx`, `settings.tsx`
- `frontend/src/pages/patients/add.tsx`, `patients/tooth-map.tsx`

---

## 11. Patient Status Calculation Logic

Computed client-side from existing patient data (no new API call):

```ts
function getPatientStatus(patient: Patient): 'new' | 'current' | 'old' {
  const completedVisits = patient.visits?.filter(v => v.status === 'completed') ?? [];
  const upcomingAppts = patient.appointments?.filter(
    a => a.status === 'scheduled' && a.appointment_date >= today
  ) ?? [];
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  if (completedVisits.length === 0) return 'new';
  if (upcomingAppts.length > 0) return 'current';
  const lastAppt = patient.appointments?.sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))[0];
  if (lastAppt && new Date(lastAppt.appointment_date) < sixMonthsAgo) return 'old';
  return 'current';
}
```

---

## 12. Clinical Flags Storage

Flags stored in Supabase `patients.medical_conditions` as a JSON string appended to existing text, OR as a separate `clinical_flags` JSONB column. Since `PUT /api/patients/:id` accepts arbitrary body fields and passes them to Supabase, this works without any backend change:

```ts
// Save flags
patientsApi.update(id, { clinical_flags: { bloodThinner: true, diabetes: false, heartCondition: false, pregnancy: false } })
```

Requires one-line Supabase migration:
```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinical_flags JSONB DEFAULT '{}';
```

---

## 13. Constraints

1. All existing API calls, useQuery hooks, and data flow stay wired exactly as before
2. Static export compatibility — no `useEffect` with SSR-only APIs
3. Capacitor WebView — dnd-kit must use pointer events (not mouse-only), which it does by default
4. No new backend routes required
5. One new SQL migration line (clinical_flags column)
