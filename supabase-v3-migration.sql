-- DentAI V3 Migration (UI redesign)
-- Run this in your Supabase SQL editor before deploying the V3 frontend.
--
-- Adds a JSONB column to store clinical flags (blood thinner, diabetes,
-- heart condition, pregnancy) plus free-text clinical notes for the
-- Complications tab. PUT /api/patients/:id already passes arbitrary body
-- fields through to Supabase, so no backend change is required.

ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinical_flags JSONB DEFAULT '{}';
