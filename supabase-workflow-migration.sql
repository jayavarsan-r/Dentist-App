-- DentAI Workflow Migration
-- Run this once in Supabase SQL Editor → New Query → Run
-- Safe to re-run (all statements use IF NOT EXISTS / IF EXISTS)

-- ─────────────────────────────────────────────
-- 1. Add missing columns to queue_entries
-- ─────────────────────────────────────────────

ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS sort_order       FLOAT   DEFAULT NULL;
ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS outcome_metadata JSONB   DEFAULT NULL;
ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS notes            TEXT    DEFAULT NULL;

-- Backfill sort_order from token_number for existing rows
UPDATE queue_entries SET sort_order = token_number WHERE sort_order IS NULL;

-- ─────────────────────────────────────────────
-- 2. Fix status CHECK constraint
--    Adds: ready_for_checkout, checked_out
-- ─────────────────────────────────────────────

ALTER TABLE queue_entries DROP CONSTRAINT IF EXISTS queue_entries_status_check;

ALTER TABLE queue_entries ADD CONSTRAINT queue_entries_status_check
  CHECK (status IN (
    'waiting',
    'in_consultation',
    'completed',
    'skipped',
    'ready_for_checkout',
    'checked_out'
  ));

-- ─────────────────────────────────────────────
-- 3. Fix consultation_outcome CHECK constraint
--    Adds: additional_sitting_required
-- ─────────────────────────────────────────────

ALTER TABLE queue_entries DROP CONSTRAINT IF EXISTS queue_entries_consultation_outcome_check;

ALTER TABLE queue_entries ADD CONSTRAINT queue_entries_consultation_outcome_check
  CHECK (
    consultation_outcome IS NULL OR
    consultation_outcome IN (
      'diagnosis_only',
      'treatment_done',
      'treatment_postponed',
      'patient_declined',
      'referred',
      'follow_up_scheduled',
      'additional_sitting_required'
    )
  );

-- ─────────────────────────────────────────────
-- 4. Patients: add clinical_flags if missing
--    (from V3 migration — safe to re-run)
-- ─────────────────────────────────────────────

ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinical_flags JSONB DEFAULT '{}';
