-- DentAI V2 Migration
-- Run this in your Supabase SQL editor before deploying the V2 backend

ALTER TABLE visits ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tooth_number TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_visits_tooth ON visits(patient_id, tooth_number) WHERE tooth_number IS NOT NULL;
