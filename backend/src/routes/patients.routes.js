const router = require('express').Router();
const ctrl = require('../controllers/patients.controller');
const auth = require('../middleware/auth');
const supabase = require('../config/supabase');

router.use(auth);
router.get('/', ctrl.list);
router.post('/', ctrl.create);

// Tooth history — must come before /:id to avoid conflict
router.get('/:id/tooth-history', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: visits, error } = await supabase
      .from('visits')
      .select('*')
      .eq('patient_id', id)
      .eq('dentist_id', req.dentistId)
      .order('visit_date', { ascending: false });

    if (error) throw error;

    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', id)
      .eq('dentist_id', req.dentistId)
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .neq('status', 'cancelled')
      .order('appointment_date');

    // Separate tooth visits from general visits
    const toothVisits = (visits || []).filter(v => v.tooth_number);
    const generalVisits = (visits || []).filter(v => !v.tooth_number);

    // Group by tooth number
    const toothMap = new Map();
    toothVisits.forEach(v => {
      const tn = v.tooth_number;
      if (!toothMap.has(tn)) {
        toothMap.set(tn, {
          toothNumber: tn,
          completedProcedures: [],
          upcomingAppointments: [],
          totalCost: 0,
          lastProcedureDate: null,
          overallStatus: 'treated',
        });
      }
      const entry = toothMap.get(tn);
      entry.completedProcedures.push({
        visitId: v.id,
        date: v.visit_date,
        procedure: v.procedure_name,
        status: v.status,
        notes: v.notes,
        cost: v.cost != null ? parseFloat(v.cost) : null,
        followUpDate: v.follow_up_date,
      });
      if (v.cost != null) entry.totalCost += parseFloat(v.cost);
      if (!entry.lastProcedureDate || v.visit_date > entry.lastProcedureDate) {
        entry.lastProcedureDate = v.visit_date;
      }
    });

    // Attach upcoming appointments by tooth
    (appointments || []).forEach(a => {
      if (a.tooth_number && toothMap.has(a.tooth_number)) {
        const entry = toothMap.get(a.tooth_number);
        entry.upcomingAppointments.push({
          appointmentId: a.id,
          date: a.appointment_date,
          time: a.appointment_time,
          purpose: a.purpose,
          status: a.status,
        });
      }
    });

    // Compute overallStatus
    toothMap.forEach(entry => {
      const hasCompleted = entry.completedProcedures.length > 0;
      const hasPending = entry.upcomingAppointments.length > 0;
      if (hasCompleted && hasPending) entry.overallStatus = 'treated_pending';
      else if (hasPending) entry.overallStatus = 'pending';
      else entry.overallStatus = 'treated';
    });

    const totalBilled = Array.from(toothMap.values()).reduce((sum, t) => sum + t.totalCost, 0)
      + (visits || []).reduce((sum, v) => sum + (v.tooth_number ? 0 : (v.cost != null ? parseFloat(v.cost) : 0)), 0);

    res.json({
      patientId: id,
      toothMap: Array.from(toothMap.values()),
      generalVisits,
      totalBilled,
    });
  } catch (e) { next(e); }
});

router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
