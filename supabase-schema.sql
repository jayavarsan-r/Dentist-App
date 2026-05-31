-- Run this entire file in Supabase Dashboard → SQL Editor → New query → Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS dentists (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT,
  clinic_name  TEXT,
  phone        TEXT UNIQUE NOT NULL,
  address      TEXT,
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "19:00"}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dentist_id         UUID REFERENCES dentists(id) ON DELETE CASCADE NOT NULL,
  name               TEXT NOT NULL,
  phone              TEXT NOT NULL,
  age                INTEGER,
  gender             TEXT CHECK (gender IN ('male', 'female', 'other')),
  medical_conditions TEXT,
  allergies          TEXT,
  is_deleted         BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  dentist_id      UUID REFERENCES dentists(id) NOT NULL,
  visit_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  procedure_name  TEXT NOT NULL,
  tooth_number    TEXT,
  status          TEXT DEFAULT 'completed'
                  CHECK (status IN ('completed', 'in_progress', 'pending', 'cancelled')),
  raw_transcript  TEXT,
  notes           TEXT,
  medications     TEXT,
  next_steps      TEXT,
  follow_up_date  DATE,
  follow_up_done  BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id       UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  dentist_id       UUID REFERENCES dentists(id) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  purpose          TEXT,
  status           TEXT DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled', 'rescheduled')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patients_dentist    ON patients(dentist_id);
CREATE INDEX IF NOT EXISTS idx_patients_name       ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_phone      ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_visits_patient      ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_dentist_date ON visits(dentist_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_followup     ON visits(follow_up_date) WHERE follow_up_date IS NOT NULL AND follow_up_done = FALSE;
CREATE INDEX IF NOT EXISTS idx_appts_dentist_date  ON appointments(dentist_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_otp_phone           ON otp_codes(phone);
