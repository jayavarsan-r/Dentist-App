import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CreditCard, FileText, CalendarPlus, CheckCircle,
  AlertTriangle, Banknote, Smartphone, Receipt
} from 'lucide-react';
import { queueApi, paymentsApi, appointmentsApi } from '@/lib/api';
import AppButton from '@/components/shared/AppButton';
import { getInitials, formatDate } from '@/lib/utils';
import type { ConsultContext, PaymentMethod } from '@/types';

const OUTCOME_LABELS: Record<string, string> = {
  treatment_done: 'Treatment Completed',
  follow_up_scheduled: 'Follow-Up Required',
  additional_sitting_required: 'Additional Sitting Required',
  referred: 'Referred to Another Doctor',
  diagnosis_only: 'Consultation Only',
  treatment_postponed: 'Treatment Postponed',
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
  { value: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'upi', label: 'UPI', icon: <Smartphone className="w-4 h-4" /> },
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

  const { data, isLoading } = useQuery<ConsultContext>({
    queryKey: ['consult-context', id],
    queryFn: () => queueApi.context(id).then(r => r.data),
    enabled: !!id,
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

  const needsAppointment = outcome && [
    'follow_up_scheduled',
    'additional_sitting_required',
    'treatment_postponed',
  ].includes(outcome);

  const suggestedDate = (() => {
    if (outcome === 'treatment_postponed' && meta?.suggested_return_date) return meta.suggested_return_date;
    if (outcome === 'follow_up_scheduled' && meta?.follow_up_days) {
      const d = new Date();
      d.setDate(d.getDate() + meta.follow_up_days);
      return d.toISOString().split('T')[0];
    }
    if (outcome === 'additional_sitting_required' && meta?.remaining_sittings) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
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
      await appointmentsApi.create({
        patientId: patient.id,
        appointmentDate,
        appointmentTime: appointmentTime || '10:00',
        purpose,
      });
      setAppointmentSaved(true);
    } finally { setSavingAppointment(false); }
  };

  const handleCompleteCheckout = async () => {
    setCompleting(true);
    try {
      await queueApi.update(id, { status: 'checked_out' });
      qc.invalidateQueries({ queryKey: ['queue'] });
      qc.invalidateQueries({ queryKey: ['action-queue'] });
      router.replace('/reception/');
    } finally { setCompleting(false); }
  };

  return (
    <div className="min-h-screen bg-bg pb-32">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-text-primary">Checkout</h1>
        <span className="text-[13px] font-semibold text-text-secondary">#{entry.token_number}</span>
      </div>

      <div className="px-5 pt-5 space-y-4">

        {/* ── PATIENT & TREATMENT SUMMARY ── */}
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
            <p style={{ fontSize: 12, color: '#6E6E73', marginBottom: 2 }}>Outcome</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>
              {OUTCOME_LABELS[outcome || ''] || 'Consultation completed'}
            </p>
            {doctorName && (
              <p style={{ fontSize: 12, color: '#6E6E73', marginTop: 2 }}>Dr. {doctorName}</p>
            )}
            {/* Outcome metadata */}
            {meta?.follow_up_days && (
              <p style={{ fontSize: 12, color: '#007AFF', marginTop: 2 }}>Follow-up in {meta.follow_up_days} days</p>
            )}
            {meta?.remaining_sittings && (
              <p style={{ fontSize: 12, color: '#007AFF', marginTop: 2 }}>{meta.remaining_sittings} sittings remaining</p>
            )}
            {meta?.referred_to_doctor_name && (
              <p style={{ fontSize: 12, color: '#007AFF', marginTop: 2 }}>Referred to Dr. {meta.referred_to_doctor_name}</p>
            )}
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
                    <span style={{ fontSize: 13, color: '#6E6E73' }}>Estimated Cost</span>
                    <span style={{ fontSize: 13, color: '#1C1C1E', fontWeight: 500 }}>
                      ₹{(+(plan.estimated_cost ?? 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ fontSize: 13, color: '#6E6E73' }}>Previously Paid</span>
                    <span style={{ fontSize: 13, color: '#1E8E3E', fontWeight: 500 }}>
                      ₹{(+(plan.collected_amount ?? 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-1.5" style={{ borderTop: '1px solid rgba(60,60,67,0.08)' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#FF3B30' }}>Amount Due</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#FF3B30' }}>
                  ₹{(+pendingBalance).toLocaleString('en-IN')}
                </span>
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
              {/* Payment method */}
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

              {/* Amount input */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-semibold">₹</span>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder={pendingBalance > 0 ? String(Math.round(pendingBalance)) : '0'}
                  className="w-full h-12 bg-surface border border-border rounded-xl pl-8 pr-4 text-[16px] font-semibold text-text-primary focus:outline-none focus:border-[#1C1C1E]"
                />
              </div>

              {/* Quick payment status buttons */}
              <div className="grid grid-cols-3 gap-2">
                {(['paid', 'partial', 'pending'] as PaymentStatus[]).map(s => (
                  <button key={s} onClick={() => {
                    setPaymentStatus(s);
                    if (s === 'paid' && pendingBalance > 0) setPaymentAmount(String(Math.round(pendingBalance)));
                    if (s === 'pending') setPaymentAmount('0');
                  }}
                    className="h-9 rounded-xl text-xs font-semibold press-effect capitalize"
                    style={{
                      background: paymentStatus === s ? (s === 'paid' ? '#E6F4EA' : s === 'partial' ? '#FFF8E1' : '#FFF1F0') : '#F2F2F7',
                      color: paymentStatus === s ? (s === 'paid' ? '#1E8E3E' : s === 'partial' ? '#C77700' : '#FF3B30') : '#6E6E73',
                    }}>
                    {s === 'paid' ? '✓ Paid' : s === 'partial' ? '½ Partial' : '⏳ Pending'}
                  </button>
                ))}
              </div>

              {parseFloat(paymentAmount) > 0 && (
                <AppButton onClick={handleSavePayment} isLoading={savingPayment} variant="secondary">
                  Record Payment ₹{paymentAmount}
                </AppButton>
              )}
            </>
          )}
        </div>

        {/* ── PRESCRIPTION ── */}
        <div className="bg-surface rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Prescription
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/patients/${patient.id}/?tab=prescriptions`)}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-border press-effect"
              style={{ color: '#007AFF' }}
            >
              <FileText className="w-4 h-4" />
              <span style={{ fontSize: 14, fontWeight: 600 }}>View Prescription</span>
            </button>
            <button
              onClick={() => router.push(`/prescription/new/?patientId=${patient.id}`)}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-border press-effect"
              style={{ color: '#1C1C1E' }}
            >
              <FileText className="w-4 h-4" />
              <span style={{ fontSize: 14, fontWeight: 600 }}>New Prescription</span>
            </button>
          </div>
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
                    <input
                      type="date"
                      value={appointmentDate}
                      defaultValue={suggestedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setAppointmentDate(e.target.value)}
                      className="w-full h-11 bg-surface border border-border rounded-xl px-3 text-[14px] text-text-primary focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Time</label>
                    <input
                      type="time"
                      value={appointmentTime}
                      onChange={e => setAppointmentTime(e.target.value)}
                      className="w-full h-11 bg-surface border border-border rounded-xl px-3 text-[14px] text-text-primary focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>
                </div>
                <AppButton
                  onClick={handleSaveAppointment}
                  isLoading={savingAppointment}
                  variant="secondary"
                  disabled={!appointmentDate}
                >
                  Confirm Appointment
                </AppButton>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── STICKY COMPLETE BUTTON ── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface border-t border-border px-5 py-4 pb-6"
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)' }}>
        <AppButton onClick={handleCompleteCheckout} isLoading={completing}>
          <CheckCircle className="w-4 h-4 mr-2" />
          Complete Checkout
        </AppButton>
        <p className="text-center mt-2" style={{ fontSize: 12, color: '#AEAEB2' }}>
          Patient will be marked as checked out
        </p>
      </div>
    </div>
  );
}
