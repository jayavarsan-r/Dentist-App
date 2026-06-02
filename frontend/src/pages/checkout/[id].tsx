import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CreditCard, FileText, CalendarPlus, CheckCircle,
  Banknote, Smartphone, Receipt, Printer, Mic, UserCheck, ChevronRight
} from 'lucide-react';
import { queueApi, paymentsApi, appointmentsApi, prescriptionsApi } from '@/lib/api';
import AppButton from '@/components/shared/AppButton';
import { getInitials, formatDate } from '@/lib/utils';
import type { ConsultContext, PaymentMethod, QueueEntry, Prescription } from '@/types';

const OUTCOME_LABELS: Record<string, string> = {
  treatment_done: 'Treatment Completed',
  follow_up_scheduled: 'Follow-Up Required',
  additional_sitting_required: 'Additional Sitting Required',
  referred: 'Referred to Another Doctor',
  diagnosis_only: 'Consultation Only',
  treatment_postponed: 'Treatment Postponed',
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cash',  label: 'Cash',  icon: <Banknote className="w-4 h-4" /> },
  { value: 'card',  label: 'Card',  icon: <CreditCard className="w-4 h-4" /> },
  { value: 'upi',   label: 'UPI',   icon: <Smartphone className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <Receipt className="w-4 h-4" /> },
];

type PaymentStatus = 'paid' | 'partial' | 'pending';

export default function CheckoutPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = router.query as { id: string };

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentSaved, setAppointmentSaved] = useState(false);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [nextPatient, setNextPatient] = useState<QueueEntry | null>(null);
  const [showNextModal, setShowNextModal] = useState(false);
  const [callingIn, setCallingIn] = useState(false);

  const { data, isLoading } = useQuery<ConsultContext>({
    queryKey: ['consult-context', id],
    queryFn: () => queueApi.context(id).then(r => r.data),
    enabled: !!id,
  });

  const patientId = data?.patient.id;
  const { data: prescriptionsData } = useQuery<{ prescriptions: Prescription[] }>({
    queryKey: ['prescriptions', patientId],
    queryFn: () => prescriptionsApi.listForPatient(patientId!).then(r => r.data),
    enabled: !!patientId,
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1C1C1E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { queueEntry: entry, patient, activePlans, pendingBalance } = data;
  const outcome = entry.consultation_outcome;
  const meta = entry.outcome_metadata;
  const doctorName = entry.assigned_doctor_staff?.name;
  const doctorNotes = entry.notes;
  const latestPrescription = prescriptionsData?.prescriptions?.[0] ?? null;

  const needsAppointment = outcome && ['follow_up_scheduled', 'additional_sitting_required', 'treatment_postponed'].includes(outcome);

  const suggestedDate = (() => {
    if (outcome === 'treatment_postponed' && meta?.suggested_return_date) return meta.suggested_return_date;
    if (outcome === 'follow_up_scheduled' && meta?.follow_up_days) {
      const d = new Date(); d.setDate(d.getDate() + meta.follow_up_days);
      return d.toISOString().split('T')[0];
    }
    if (outcome === 'additional_sitting_required') {
      const d = new Date(); d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    }
    return '';
  })();

  const handleSavePayment = async () => {
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) return;
    setSavingPayment(true);
    try {
      await paymentsApi.create({
        patientId: patient.id,
        treatmentPlanId: activePlans[0]?.id || null,
        queueEntryId: entry.id,
        amount: amt,
        paymentMethod,
        notes: `Checkout — ${OUTCOME_LABELS[outcome || ''] || ''}`,
      });
      setPaymentSaved(true);
      qc.invalidateQueries({ queryKey: ['consult-context', id] });
    } finally { setSavingPayment(false); }
  };

  const handleSaveAppointment = async () => {
    if (!appointmentDate) return;
    setSavingAppointment(true);
    try {
      const purpose = (() => {
        if (outcome === 'follow_up_scheduled') return `Follow-up${meta?.follow_up_days ? ` (${meta.follow_up_days} days)` : ''}`;
        if (outcome === 'additional_sitting_required') return activePlans[0]?.procedure_name || 'Next sitting';
        return 'Return appointment';
      })();
      await appointmentsApi.create({ patientId: patient.id, appointmentDate, appointmentTime: appointmentTime || '10:00', purpose });
      setAppointmentSaved(true);
    } finally { setSavingAppointment(false); }
  };

  const handleCompleteCheckout = async () => {
    setCompleting(true);
    try {
      await queueApi.update(id, { status: 'checked_out' });
      qc.invalidateQueries({ queryKey: ['queue'] });
      qc.invalidateQueries({ queryKey: ['action-queue'] });

      // Find next waiting patient
      const queueRes = await queueApi.list();
      const waiting = (queueRes.data.queue || []).filter((e: QueueEntry) => e.status === 'waiting');
      if (waiting.length > 0) {
        setNextPatient(waiting[0]);
        setShowNextModal(true);
      } else {
        router.replace('/reception/');
      }
    } finally { setCompleting(false); }
  };

  const handleCallInNext = async () => {
    if (!nextPatient) return;
    setCallingIn(true);
    try {
      await queueApi.update(nextPatient.id, { status: 'in_consultation' });
      qc.invalidateQueries({ queryKey: ['queue'] });
    } finally {
      setCallingIn(false);
      router.replace('/reception/');
    }
  };

  const handlePrintPrescription = () => {
    if (latestPrescription) {
      router.push(`/prescription/${latestPrescription.id}/`);
    } else {
      router.push(`/prescription/new/?patientId=${patient.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-32">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-[17px] font-semibold text-text-primary">Checkout</h1>
          <p style={{ fontSize: 12, color: '#6E6E73' }}>{patient.name} · #{entry.token_number}</p>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: entry.priority === 'urgent' ? '#FF3B30' : '#6E6E73' }}>
          {entry.priority === 'urgent' ? 'URGENT' : ''}
        </span>
      </div>

      <div className="px-5 pt-5 space-y-4">

        {/* ── TREATMENT SUMMARY ── */}
        <div className="bg-surface rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white text-base font-bold flex-shrink-0">
              {getInitials(patient.name)}
            </div>
            <div className="flex-1">
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>{patient.name}</p>
              <p style={{ fontSize: 13, color: '#6E6E73' }}>
                {[patient.age && `${patient.age} yrs`, patient.phone].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div className="rounded-xl px-3.5 py-2.5" style={{ background: '#F2F2F7' }}>
            <p style={{ fontSize: 12, color: '#6E6E73', marginBottom: 2 }}>
              {OUTCOME_LABELS[outcome || ''] || 'Consultation completed'}
            </p>
            {doctorName && <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>Dr. {doctorName}</p>}
            {meta?.follow_up_days && <p style={{ fontSize: 12, color: '#007AFF', marginTop: 2 }}>Follow-up in {meta.follow_up_days} days</p>}
            {meta?.remaining_sittings && <p style={{ fontSize: 12, color: '#007AFF', marginTop: 2 }}>{meta.remaining_sittings} sittings remaining</p>}
            {meta?.referred_to_doctor_name && <p style={{ fontSize: 12, color: '#007AFF', marginTop: 2 }}>Referred to Dr. {meta.referred_to_doctor_name}</p>}
          </div>

          {activePlans.length > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(60,60,67,0.08)' }}>
              {activePlans.map(plan => (
                <div key={plan.id} className="flex items-center justify-between">
                  <p style={{ fontSize: 13, color: '#1C1C1E' }}>{plan.procedure_name}</p>
                  <p style={{ fontSize: 13, color: '#6E6E73' }}>{plan.completed_sittings}/{plan.total_sittings} sittings</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── DOCTOR'S NOTES ── */}
        {doctorNotes && (
          <div className="bg-surface rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)', borderLeft: '3px solid #1B86B8' }}>
            <div className="flex items-center gap-2 mb-2.5">
              <Mic className="w-4 h-4" style={{ color: '#1B86B8' }} />
              <p style={{ fontSize: 11, fontWeight: 600, color: '#1B86B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Doctor&apos;s Notes
              </p>
            </div>
            <p style={{ fontSize: 14, color: '#1C1C1E', lineHeight: 1.6 }}>{doctorNotes}</p>
          </div>
        )}

        {/* ── PRESCRIPTION ── */}
        <div className="bg-surface rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Prescription
          </p>

          {latestPrescription ? (
            <>
              {latestPrescription.medicines.length > 0 && (
                <div className="space-y-2 mb-3">
                  {latestPrescription.medicines.slice(0, 3).map((med, i) => (
                    <div key={i} className="flex items-start justify-between gap-2">
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>{med.name}</p>
                      <p style={{ fontSize: 12, color: '#6E6E73', textAlign: 'right', flexShrink: 0 }}>
                        {[med.dose, med.frequency, med.duration].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  ))}
                  {latestPrescription.medicines.length > 3 && (
                    <p style={{ fontSize: 12, color: '#6E6E73' }}>+{latestPrescription.medicines.length - 3} more</p>
                  )}
                </div>
              )}
              {latestPrescription.instructions && (
                <p style={{ fontSize: 13, color: '#6E6E73', fontStyle: 'italic', marginBottom: 10 }}>
                  {latestPrescription.instructions}
                </p>
              )}
              <button
                onClick={handlePrintPrescription}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl press-effect"
                style={{ background: '#1C1C1E', color: '#fff' }}>
                <Printer className="w-4 h-4" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Print Prescription</span>
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/patients/${patient.id}/?tab=prescriptions`)}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-border press-effect"
                style={{ color: '#007AFF' }}>
                <FileText className="w-4 h-4" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>View</span>
              </button>
              <button
                onClick={() => router.push(`/prescription/new/?patientId=${patient.id}`)}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl press-effect"
                style={{ background: '#1C1C1E', color: '#fff' }}>
                <FileText className="w-4 h-4" />
                <span style={{ fontSize: 14, fontWeight: 600 }}>New Prescription</span>
              </button>
            </div>
          )}
        </div>

        {/* ── NEXT APPOINTMENT ── */}
        {needsAppointment && (
          <div className="bg-surface rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-2 mb-3">
              <CalendarPlus className="w-4 h-4 text-accent" />
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Schedule {outcome === 'additional_sitting_required' ? 'Next Sitting' : 'Appointment'}
              </p>
            </div>

            {appointmentSaved ? (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#E6F4EA' }}>
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1E8E3E' }}>Appointment scheduled for {formatDate(appointmentDate)}</p>
              </div>
            ) : (
              <>
                {meta?.follow_up_days && (
                  <p style={{ fontSize: 13, color: '#007AFF', marginBottom: 10 }}>
                    Suggested: in {meta.follow_up_days} days ({formatDate(suggestedDate)})
                  </p>
                )}
                {meta?.remaining_sittings && (
                  <p style={{ fontSize: 13, color: '#007AFF', marginBottom: 10 }}>
                    {meta.remaining_sittings} sittings remaining
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Date</label>
                    <input type="date" value={appointmentDate} defaultValue={suggestedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setAppointmentDate(e.target.value)}
                      className="w-full h-11 bg-surface border border-border rounded-xl px-3 text-[14px] text-text-primary focus:outline-none focus:border-[#1C1C1E]" />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Time</label>
                    <input type="time" value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)}
                      className="w-full h-11 bg-surface border border-border rounded-xl px-3 text-[14px] text-text-primary focus:outline-none focus:border-[#1C1C1E]" />
                  </div>
                </div>
                <AppButton onClick={handleSaveAppointment} isLoading={savingAppointment} variant="secondary" disabled={!appointmentDate}>
                  Confirm Appointment
                </AppButton>
              </>
            )}
          </div>
        )}

        {/* ── PAYMENT ── */}
        <div className="bg-surface rounded-2xl p-4 space-y-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Payment
          </p>

          {/* Balance summary */}
          {activePlans.length > 0 && (
            <div className="space-y-1.5">
              {activePlans.map(plan => (
                <div key={plan.id}>
                  <div className="flex justify-between">
                    <span style={{ fontSize: 13, color: '#6E6E73' }}>Total Cost</span>
                    <span style={{ fontSize: 13, color: '#1C1C1E', fontWeight: 500 }}>₹{(+(plan.estimated_cost ?? 0)).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ fontSize: 13, color: '#6E6E73' }}>Paid so far</span>
                    <span style={{ fontSize: 13, color: '#1E8E3E', fontWeight: 500 }}>₹{(+(plan.collected_amount ?? 0)).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-1.5" style={{ borderTop: '1px solid rgba(60,60,67,0.08)' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#FF3B30' }}>Balance Due</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#FF3B30' }}>₹{(+pendingBalance).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {paymentSaved ? (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: '#E6F4EA' }}>
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E8E3E' }}>Payment of ₹{paymentAmount} recorded</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl press-effect"
                    style={{ background: paymentMethod === m.value ? '#1C1C1E' : '#F2F2F7', color: paymentMethod === m.value ? '#fff' : '#6E6E73' }}>
                    {m.icon}
                    <span style={{ fontSize: 10, fontWeight: 600 }}>{m.label}</span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-semibold">₹</span>
                <input type="number" value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder={pendingBalance > 0 ? String(Math.round(+pendingBalance)) : '0'}
                  className="w-full h-12 bg-surface border border-border rounded-xl pl-8 pr-4 text-[16px] font-semibold text-text-primary focus:outline-none focus:border-[#1C1C1E]" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['paid', 'partial', 'pending'] as PaymentStatus[]).map(s => (
                  <button key={s} onClick={() => {
                    setPaymentStatus(s);
                    if (s === 'paid' && pendingBalance > 0) setPaymentAmount(String(Math.round(+pendingBalance)));
                    if (s === 'pending') setPaymentAmount('0');
                  }}
                    className="h-9 rounded-xl text-xs font-semibold press-effect capitalize"
                    style={{
                      background: paymentStatus === s ? (s === 'paid' ? '#E6F4EA' : s === 'partial' ? '#FFF8E1' : '#FFF1F0') : '#F2F2F7',
                      color: paymentStatus === s ? (s === 'paid' ? '#1E8E3E' : s === 'partial' ? '#C77700' : '#FF3B30') : '#6E6E73',
                    }}>
                    {s === 'paid' ? '✓ Full' : s === 'partial' ? '½ Partial' : '⏳ Skip'}
                  </button>
                ))}
              </div>

              {parseFloat(paymentAmount) > 0 && (
                <AppButton onClick={handleSavePayment} isLoading={savingPayment} variant="secondary">
                  Record ₹{paymentAmount} Payment
                </AppButton>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── STICKY COMPLETE ── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface border-t border-border px-5 py-4 pb-6"
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)' }}>
        <AppButton onClick={handleCompleteCheckout} isLoading={completing}>
          <CheckCircle className="w-4 h-4 mr-2" /> Complete Checkout
        </AppButton>
        <p className="text-center mt-2" style={{ fontSize: 12, color: '#AEAEB2' }}>
          Marks patient as checked out and advances the queue
        </p>
      </div>

      {/* ── NEXT PATIENT MODAL ── */}
      {showNextModal && nextPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-surface rounded-t-2xl w-full max-w-lg mx-auto pb-8"
            style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.18)' }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(60,60,67,0.18)' }} />
            </div>

            <div className="px-5 pt-3 pb-1">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(52,199,89,0.12)' }}>
                  <CheckCircle className="w-5 h-5" style={{ color: '#1E8E3E' }} />
                </div>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#1C1C1E' }}>Checkout complete</p>
                  <p style={{ fontSize: 13, color: '#6E6E73' }}>{patient.name} has been checked out.</p>
                </div>
              </div>
            </div>

            <div className="mx-5 my-4 rounded-2xl p-4" style={{ background: '#F2F2F7' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Next in queue
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] flex-shrink-0"
                  style={{ background: nextPatient.priority === 'urgent' ? '#FFF1F0' : '#E5E5EA', color: nextPatient.priority === 'urgent' ? '#FF3B30' : '#1C1C1E' }}>
                  {nextPatient.token_number}
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{nextPatient.patients?.name || '—'}</p>
                  {nextPatient.chief_complaint && (
                    <p style={{ fontSize: 13, color: '#6E6E73' }}>{nextPatient.chief_complaint}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 space-y-2.5">
              <button
                onClick={handleCallInNext}
                disabled={callingIn}
                className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-semibold press-effect disabled:opacity-60"
                style={{ background: '#1C1C1E', fontSize: 15 }}>
                <UserCheck className="w-4 h-4" />
                {callingIn ? 'Calling in…' : `Call In ${nextPatient.patients?.name?.split(' ')[0] || 'Next Patient'}`}
              </button>
              <button onClick={() => router.replace('/reception/')}
                className="w-full h-11 rounded-2xl flex items-center justify-center font-semibold press-effect"
                style={{ background: '#F2F2F7', color: '#6E6E73', fontSize: 14 }}>
                Later
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
