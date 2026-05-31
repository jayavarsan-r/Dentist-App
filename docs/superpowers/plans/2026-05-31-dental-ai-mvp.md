# DentAI MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Dental AI Practice Management app — Node.js/Express backend + Flutter Android frontend — producing a working debug APK.

**Architecture:** Express REST API backed by Supabase (Postgres), Flutter frontend using Riverpod + GoRouter. Voice notes go Backend → Sarvam AI (STT) → Claude API (structured note). No RLS needed — backend uses service role key.

**Tech Stack:** Node.js 18, Express 4, @supabase/supabase-js 2, Flutter 3.x, Riverpod 2, GoRouter 13, Dio 5, record package, table_calendar, shimmer, flutter_animate.

---

## Phase 1 — Backend

### Task 1: Backend project scaffold

**Files:**
- Create: `backend/package.json`
- Create: `backend/.env`
- Create: `backend/.env.example`
- Create: `backend/src/server.js`
- Create: `backend/src/config/supabase.js`
- Create: `backend/src/middleware/auth.js`
- Create: `backend/src/middleware/errorHandler.js`

- [ ] Create `backend/package.json`:
```json
{
  "name": "dental-ai-backend",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": { "start": "node src/server.js", "dev": "nodemon src/server.js" },
  "dependencies": {
    "express": "^4.18.2", "cors": "^2.8.5", "@supabase/supabase-js": "^2.39.0",
    "dotenv": "^16.4.1", "axios": "^1.6.5", "multer": "^1.4.5-lts.1",
    "form-data": "^4.0.0", "jsonwebtoken": "^9.0.2",
    "express-rate-limit": "^7.2.0", "helmet": "^7.1.0", "morgan": "^1.10.0"
  },
  "devDependencies": { "nodemon": "^3.0.2" }
}
```

- [ ] Create `backend/.env` (fill real keys before running):
```
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
JWT_SECRET=change_this_to_64_char_random_string
SARVAM_API_KEY=your_sarvam_key
ANTHROPIC_API_KEY=your_anthropic_key
DEV_OTP=123456
USE_DEV_OTP=true
```

- [ ] Create `backend/src/config/supabase.js`:
```js
const { createClient } = require('@supabase/supabase-js');
module.exports = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
```

- [ ] Create `backend/src/middleware/auth.js`:
```js
const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.dentistId = decoded.dentistId;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};
```

- [ ] Create `backend/src/middleware/errorHandler.js`:
```js
module.exports = (err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
};
```

- [ ] Create `backend/src/server.js`:
```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/patients', require('./routes/patients.routes'));
app.use('/api/visits', require('./routes/visits.routes'));
app.use('/api/appointments', require('./routes/appointments.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`DentAI Backend running on port ${PORT}`));
```

- [ ] Run `cd backend && npm install` — expect no errors.

---

### Task 2: Auth routes & controller

**Files:**
- Create: `backend/src/routes/auth.routes.js`
- Create: `backend/src/controllers/auth.controller.js`

- [ ] Create `backend/src/controllers/auth.controller.js`:
```js
const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Valid 10-digit phone required' });
    const otp = process.env.USE_DEV_OTP === 'true' ? process.env.DEV_OTP : Math.floor(100000 + Math.random() * 900000).toString();
    await supabase.from('otp_codes').delete().eq('phone', phone);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await supabase.from('otp_codes').insert({ phone, code: otp, expires_at: expiresAt });
    res.json({ success: true, message: 'OTP sent' });
  } catch (e) { next(e); }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const { data: otpRecord } = await supabase.from('otp_codes')
      .select('*').eq('phone', phone).eq('code', otp).eq('used', false)
      .gt('expires_at', new Date().toISOString()).single();
    if (!otpRecord) return res.status(400).json({ error: 'Invalid or expired OTP' });
    await supabase.from('otp_codes').update({ used: true }).eq('id', otpRecord.id);
    let { data: dentist } = await supabase.from('dentists').select('*').eq('phone', phone).single();
    let isNewUser = false;
    if (!dentist) {
      const { data: newDentist } = await supabase.from('dentists').insert({ phone }).select().single();
      dentist = newDentist;
      isNewUser = true;
    }
    const token = jwt.sign({ dentistId: dentist.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, dentist, isNewUser });
  } catch (e) { next(e); }
};

exports.getMe = async (req, res, next) => {
  try {
    const { data: dentist } = await supabase.from('dentists').select('*').eq('id', req.dentistId).single();
    res.json({ dentist });
  } catch (e) { next(e); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, clinic_name, phone } = req.body;
    const { data: dentist } = await supabase.from('dentists')
      .update({ name, clinic_name, phone, updated_at: new Date().toISOString() })
      .eq('id', req.dentistId).select().single();
    res.json({ dentist });
  } catch (e) { next(e); }
};
```

- [ ] Create `backend/src/routes/auth.routes.js`:
```js
const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const auth = require('../middleware/auth');
router.post('/send-otp', ctrl.sendOtp);
router.post('/verify-otp', ctrl.verifyOtp);
router.get('/me', auth, ctrl.getMe);
router.put('/profile', auth, ctrl.updateProfile);
module.exports = router;
```

---

### Task 3: Patients routes & controller

**Files:**
- Create: `backend/src/routes/patients.routes.js`
- Create: `backend/src/controllers/patients.controller.js`

- [ ] Create `backend/src/controllers/patients.controller.js`:
```js
const supabase = require('../config/supabase');

exports.list = async (req, res, next) => {
  try {
    const { q } = req.query;
    let query = supabase.from('patients')
      .select('*, visits(id, visit_date, procedure_name, status, follow_up_date), appointments(id, appointment_date, appointment_time, status)')
      .eq('dentist_id', req.dentistId).eq('is_deleted', false).order('name');
    if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ patients: data });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, phone, age, gender, medical_conditions, allergies } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
    const { data: patient, error } = await supabase.from('patients')
      .insert({ dentist_id: req.dentistId, name, phone, age, gender, medical_conditions, allergies })
      .select().single();
    if (error) throw error;
    res.status(201).json({ patient });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const { data: patient, error } = await supabase.from('patients')
      .select('*, visits(*), appointments(*)')
      .eq('id', req.params.id).eq('dentist_id', req.dentistId).single();
    if (error || !patient) return res.status(404).json({ error: 'Patient not found' });
    res.json({ patient });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { data: patient, error } = await supabase.from('patients')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).eq('dentist_id', req.dentistId).select().single();
    if (error) throw error;
    res.json({ patient });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await supabase.from('patients').update({ is_deleted: true }).eq('id', req.params.id).eq('dentist_id', req.dentistId);
    res.json({ success: true });
  } catch (e) { next(e); }
};
```

- [ ] Create `backend/src/routes/patients.routes.js`:
```js
const router = require('express').Router();
const ctrl = require('../controllers/patients.controller');
const auth = require('../middleware/auth');
router.use(auth);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
module.exports = router;
```

---

### Task 4: Visits, Appointments, Analytics routes & controllers

**Files:**
- Create: `backend/src/routes/visits.routes.js`
- Create: `backend/src/controllers/visits.controller.js`
- Create: `backend/src/routes/appointments.routes.js`
- Create: `backend/src/controllers/appointments.controller.js`
- Create: `backend/src/routes/analytics.routes.js`
- Create: `backend/src/controllers/analytics.controller.js` (inline in route for brevity)

- [ ] Create `backend/src/controllers/visits.controller.js`:
```js
const supabase = require('../config/supabase');

exports.list = async (req, res, next) => {
  try {
    const { patientId } = req.query;
    let query = supabase.from('visits').select('*').eq('dentist_id', req.dentistId).order('visit_date', { ascending: false });
    if (patientId) query = query.eq('patient_id', patientId);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ visits: data });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { patientId, procedureName, toothNumber, status, rawTranscript, notes, medications, nextSteps, followUpDate, visitDate } = req.body;
    const { data: visit, error } = await supabase.from('visits').insert({
      patient_id: patientId, dentist_id: req.dentistId,
      procedure_name: procedureName, tooth_number: toothNumber,
      status: status || 'completed', raw_transcript: rawTranscript,
      notes, medications, next_steps: nextSteps,
      follow_up_date: followUpDate, visit_date: visitDate || new Date().toISOString().split('T')[0]
    }).select().single();
    if (error) throw error;
    res.status(201).json({ visit });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const { data: visit, error } = await supabase.from('visits').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    res.json({ visit });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const updates = {};
    const map = { procedureName:'procedure_name', toothNumber:'tooth_number', followUpDate:'follow_up_date', followUpDone:'follow_up_done', nextSteps:'next_steps', rawTranscript:'raw_transcript' };
    Object.entries(req.body).forEach(([k,v]) => { updates[map[k] || k] = v; });
    updates.updated_at = new Date().toISOString();
    const { data: visit, error } = await supabase.from('visits').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ visit });
  } catch (e) { next(e); }
};
```

- [ ] Create `backend/src/routes/visits.routes.js`:
```js
const router = require('express').Router();
const ctrl = require('../controllers/visits.controller');
const auth = require('../middleware/auth');
router.use(auth);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
module.exports = router;
```

- [ ] Create `backend/src/controllers/appointments.controller.js`:
```js
const supabase = require('../config/supabase');

exports.list = async (req, res, next) => {
  try {
    const { date } = req.query;
    let query = supabase.from('appointments')
      .select('*, patients(id, name, phone)')
      .eq('dentist_id', req.dentistId).order('appointment_time');
    if (date) query = query.eq('appointment_date', date);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ appointments: data });
  } catch (e) { next(e); }
};

exports.today = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('appointments')
      .select('*, patients(id, name, phone)').eq('dentist_id', req.dentistId)
      .eq('appointment_date', today).order('appointment_time');
    if (error) throw error;
    res.json({ appointments: data });
  } catch (e) { next(e); }
};

exports.upcoming = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data, error } = await supabase.from('appointments')
      .select('*, patients(id, name, phone)').eq('dentist_id', req.dentistId)
      .gte('appointment_date', today).lte('appointment_date', nextWeek).order('appointment_date').order('appointment_time');
    if (error) throw error;
    res.json({ appointments: data });
  } catch (e) { next(e); }
};

exports.bookedSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    const { data, error } = await supabase.from('appointments')
      .select('appointment_time').eq('dentist_id', req.dentistId)
      .eq('appointment_date', date).neq('status', 'cancelled');
    if (error) throw error;
    res.json({ bookedSlots: data.map(a => a.appointment_time) });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { patientId, appointmentDate, appointmentTime, purpose } = req.body;
    const { data: appointment, error } = await supabase.from('appointments').insert({
      patient_id: patientId, dentist_id: req.dentistId,
      appointment_date: appointmentDate, appointment_time: appointmentTime, purpose
    }).select().single();
    if (error) throw error;
    res.status(201).json({ appointment });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { data: appointment, error } = await supabase.from('appointments')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ appointment });
  } catch (e) { next(e); }
};
```

- [ ] Create `backend/src/routes/appointments.routes.js`:
```js
const router = require('express').Router();
const ctrl = require('../controllers/appointments.controller');
const auth = require('../middleware/auth');
router.use(auth);
router.get('/today', ctrl.today);
router.get('/upcoming', ctrl.upcoming);
router.get('/booked-slots', ctrl.bookedSlots);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
module.exports = router;
```

- [ ] Create `backend/src/routes/analytics.routes.js`:
```js
const router = require('express').Router();
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');
router.get('/dashboard', auth, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [{ data: appts }, { data: visits }, { data: followups }] = await Promise.all([
      supabase.from('appointments').select('status').eq('dentist_id', req.dentistId).eq('appointment_date', today),
      supabase.from('visits').select('id').eq('dentist_id', req.dentistId).eq('visit_date', today),
      supabase.from('visits').select('*, patients(id,name,phone)').eq('dentist_id', req.dentistId)
        .lte('follow_up_date', today).eq('follow_up_done', false).not('follow_up_date', 'is', null)
    ]);
    res.json({
      totalAppointmentsToday: appts?.length || 0,
      upcomingToday: appts?.filter(a => a.status === 'scheduled').length || 0,
      completedToday: visits?.length || 0,
      pendingFollowUps: followups?.length || 0,
      followups: followups || []
    });
  } catch (e) { next(e); }
});
module.exports = router;
```

---

### Task 5: AI routes (Sarvam + Claude)

**Files:**
- Create: `backend/src/routes/ai.routes.js`
- Create: `backend/src/controllers/ai.controller.js`

- [ ] Create `backend/src/controllers/ai.controller.js`:
```js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const upload = multer({ dest: '/tmp/dental-uploads/' });
exports.uploadMiddleware = upload.single('audio');

exports.transcribe = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Audio file required' });
    if (!process.env.SARVAM_API_KEY || process.env.SARVAM_API_KEY === 'your_sarvam_key') {
      fs.unlinkSync(req.file.path);
      return res.json({ transcript: '[Sarvam API not configured - test transcript. Root canal completed on tooth 26. Patient tolerated procedure well. Follow up in 7 days.]' });
    }
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), { filename: 'recording.wav', contentType: 'audio/wav' });
    formData.append('language_code', 'en-IN');
    formData.append('model', 'saarika:v2');
    formData.append('with_timestamps', 'false');
    const response = await axios.post('https://api.sarvam.ai/speech-to-text', formData, {
      headers: { ...formData.getHeaders(), 'api-subscription-key': process.env.SARVAM_API_KEY }
    });
    fs.unlinkSync(req.file.path);
    res.json({ transcript: response.data.transcript });
  } catch (e) { if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {} next(e); }
};

const SYSTEM_PROMPT = `You are a dental clinical AI assistant. Extract structured information from a dentist's voice note and return ONLY valid JSON with this schema:
{"procedure":"string","toothNumber":"string or null","status":"completed|in_progress|pending","notes":"string","medications":"string or null","nextSteps":"string or null","followUpDays":"number or null","followUpDate":"ISO date string or null"}
Return ONLY the JSON object, no markdown, no explanation.`;

exports.generateNote = async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'Transcript required' });
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_key') {
      const followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return res.json({ structured: { procedure: 'Root Canal', toothNumber: '26', status: 'completed', notes: 'Temporary crown placed. Patient tolerated procedure well.', medications: null, nextSteps: 'Permanent crown next visit', followUpDays: 7, followUpDate } });
    }
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514', max_tokens: 1024, system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }]
    }, { headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } });
    let text = response.data.content[0].text.trim();
    if (text.startsWith('```')) text = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const structured = JSON.parse(text);
    res.json({ structured });
  } catch (e) { next(e); }
};
```

- [ ] Create `backend/src/routes/ai.routes.js`:
```js
const router = require('express').Router();
const ctrl = require('../controllers/ai.controller');
const auth = require('../middleware/auth');
router.post('/transcribe', auth, ctrl.uploadMiddleware, ctrl.transcribe);
router.post('/generate-note', auth, ctrl.generateNote);
module.exports = router;
```

- [ ] Verify backend starts: `cd backend && node src/server.js` → should print `DentAI Backend running on port 3000`. Ctrl+C after confirming.

---

## Phase 2 — Flutter Foundation

### Task 6: Flutter project init + pubspec + AndroidManifest

- [ ] From `Dentist-app/` run:
```bash
flutter create frontend --org com.dentai --platforms android
```

- [ ] Replace `frontend/pubspec.yaml` with the full spec from Section A2 (copy exactly).

- [ ] Run `cd frontend && flutter pub get` — expect no errors.

- [ ] Add permissions to `frontend/android/app/src/main/AndroidManifest.xml` inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
<uses-permission android:name="android.permission.USE_EXACT_ALARM"/>
```

- [ ] Create asset directories:
```bash
mkdir -p frontend/assets/images frontend/assets/icons
```

---

### Task 7: Core theme files

**Files:**
- Create: `frontend/lib/core/theme/app_colors.dart`
- Create: `frontend/lib/core/theme/app_typography.dart`
- Create: `frontend/lib/core/theme/app_spacing.dart`
- Create: `frontend/lib/core/theme/app_theme.dart`

- [ ] Create each theme file exactly as specified in Section B1–B4 of the master spec.

---

### Task 8: Constants, Models, Services

**Files:**
- Create: `frontend/lib/core/constants/app_constants.dart`
- Create: `frontend/lib/core/models/user_model.dart`
- Create: `frontend/lib/core/models/patient_model.dart`
- Create: `frontend/lib/core/models/visit_model.dart`
- Create: `frontend/lib/core/models/appointment_model.dart`
- Create: `frontend/lib/core/services/storage_service.dart`
- Create: `frontend/lib/core/services/api_service.dart`
- Create: `frontend/lib/core/services/audio_service.dart`

- [ ] Models, services, constants are created per spec sections A4 and F3-F4.

---

### Task 9: Providers + Router

**Files:**
- Create: `frontend/lib/core/providers/auth_provider.dart`
- Create: `frontend/lib/core/providers/patients_provider.dart`
- Create: `frontend/lib/core/providers/appointments_provider.dart`
- Create: `frontend/lib/core/providers/dashboard_provider.dart`
- Create: `frontend/lib/core/router/app_router.dart`

- [ ] Router implements ShellRoute with 5-tab bottom nav per Section B6.

---

### Task 10: Shared widgets

**Files:** All files under `frontend/lib/shared/widgets/`

- [ ] Implement all 8 shared widgets per Section B5 specs.

---

## Phase 3 — Screens (implement per Section B8)

### Task 11: Auth screens (Login + OTP)
### Task 12: Dashboard screen + widgets
### Task 13: Patient screens (List, Add, Profile)
### Task 14: Voice Recording + Case Note screens
### Task 15: Appointment screens (Scheduler, Calendar, Upcoming)
### Task 16: Follow-up + Settings screens

---

## Phase 4 — Main entry + Build

### Task 17: main.dart + app.dart + Build APK

- [ ] Wire `main.dart` with ProviderScope + AppTheme.
- [ ] Run `cd frontend && flutter build apk --debug`
- [ ] Verify: `ls -lh frontend/build/app/outputs/flutter-apk/app-debug.apk`

---

## Self-Review Checklist

- [ ] All 13 screens implemented
- [ ] Zero hardcoded hex/pixel values (all reference AppColors/AppSpacing/AppTypography)
- [ ] Backend starts clean on port 3000
- [ ] APK generated and path printed
- [ ] All AndroidManifest permissions present
- [ ] Shimmer loading + empty states on all list screens
- [ ] Auth interceptor in Dio ApiService
- [ ] Voice recording screen uses dark theme (darkBg)
