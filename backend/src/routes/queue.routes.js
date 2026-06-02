const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

// GET /api/queue — today's queue for the clinic
router.get('/', auth, async (req, res, next) => {
  try {
    if (!req.clinicId) return res.status(403).json({ error: 'No clinic context' });
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('queue_entries')
      .select(`
        *,
        patients(id, name, phone, age, gender, allergies, clinical_flags),
        treatment_plans(id, procedure_name, total_sittings, completed_sittings, pending_amount),
        added_by_staff:added_by(id, name, role),
        assigned_doctor_staff:assigned_doctor(id, name, role)
      `)
      .eq('clinic_id', req.clinicId)
      .eq('queue_date', today)
      .order('token_number', { ascending: true });

    if (error) throw error;
    res.json({ queue: data || [] });
  } catch (e) { next(e); }
});

// POST /api/queue — add patient to queue
router.post('/', auth, async (req, res, next) => {
  try {
    if (!req.clinicId) return res.status(403).json({ error: 'No clinic context' });
    const { patientId, chiefComplaint, visitReason, priority, assignedDoctor, treatmentPlanId } = req.body;
    if (!patientId) return res.status(400).json({ error: 'patientId required' });

    const today = new Date().toISOString().split('T')[0];

    // Get next token number for today
    const { count } = await supabase
      .from('queue_entries')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', req.clinicId)
      .eq('queue_date', today);

    const { data, error } = await supabase.from('queue_entries').insert({
      clinic_id:         req.clinicId,
      patient_id:        patientId,
      treatment_plan_id: treatmentPlanId || null,
      added_by:          req.staffId || null,
      assigned_doctor:   assignedDoctor || null,
      chief_complaint:   chiefComplaint || null,
      visit_reason:      visitReason || null,
      priority:          priority || 'normal',
      queue_date:        today,
      token_number:      (count || 0) + 1,
      status:            'waiting',
    }).select(`
      *,
      patients(id, name, phone, age, gender),
      treatment_plans(id, procedure_name, total_sittings, completed_sittings)
    `).single();

    if (error) throw error;
    res.status(201).json({ entry: data });
  } catch (e) { next(e); }
});

// PATCH /api/queue/:id — update status, outcome, assigned doctor
router.patch('/:id', auth, async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.status)               updates.status = req.body.status;
    if (req.body.consultationOutcome)  updates.consultation_outcome = req.body.consultationOutcome;
    if (req.body.assignedDoctor !== undefined) updates.assigned_doctor = req.body.assignedDoctor;
    if (req.body.notes)                updates.notes = req.body.notes;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('queue_entries')
      .update(updates)
      .eq('id', req.params.id)
      .eq('clinic_id', req.clinicId)
      .select().single();

    if (error) throw error;
    res.json({ entry: data });
  } catch (e) { next(e); }
});

// DELETE /api/queue/:id — remove from queue
router.delete('/:id', auth, async (req, res, next) => {
  try {
    await supabase.from('queue_entries').delete().eq('id', req.params.id).eq('clinic_id', req.clinicId);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /api/queue/:id/context — consultation context screen data
router.get('/:id/context', auth, async (req, res, next) => {
  try {
    const { data: entry, error } = await supabase
      .from('queue_entries')
      .select(`
        *,
        patients(id, name, phone, age, gender, allergies, medical_conditions, clinical_flags),
        treatment_plans(id, procedure_name, total_sittings, completed_sittings, pending_amount, estimated_cost, collected_amount, diagnosis),
        assigned_doctor_staff:assigned_doctor(id, name)
      `)
      .eq('id', req.params.id)
      .eq('clinic_id', req.clinicId)
      .single();

    if (error || !entry) return res.status(404).json({ error: 'Queue entry not found' });

    const patientId = entry.patient_id;
    const today = new Date().toISOString().split('T')[0];

    const [plansRes, lastVisitRes, todayXraysRes] = await Promise.all([
      supabase.from('treatment_plans')
        .select('id, procedure_name, total_sittings, completed_sittings, pending_amount, status, estimated_cost, collected_amount')
        .eq('patient_id', patientId).eq('status', 'active').limit(3),
      supabase.from('visits')
        .select('id, visit_date, procedure_name, notes, medications, cost, status')
        .eq('patient_id', patientId)
        .order('visit_date', { ascending: false }).limit(1),
      supabase.from('xrays')
        .select('id, xray_type, date_taken, tooth_number, notes')
        .eq('patient_id', patientId).eq('date_taken', today),
    ]);

    const pendingBalance = (plansRes.data || []).reduce((s, p) => s + (parseFloat(p.pending_amount) || 0), 0);

    res.json({
      queueEntry:    entry,
      patient:       entry.patients,
      activePlans:   plansRes.data || [],
      lastVisit:     lastVisitRes.data?.[0] || null,
      todayXrays:    todayXraysRes.data || [],
      pendingBalance,
    });
  } catch (e) { next(e); }
});

module.exports = router;
