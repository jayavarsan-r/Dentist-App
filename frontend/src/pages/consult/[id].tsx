import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mic, CheckCircle2, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { queueApi } from '@/lib/api';
import AppButton from '@/components/shared/AppButton';
import { formatDate, getInitials } from '@/lib/utils';
import type { ConsultContext, ConsultationOutcome } from '@/types';

const OUTCOMES: { value: ConsultationOutcome; label: string }[] = [
  { value: 'treatment_done',        label: 'Treatment done' },
  { value: 'diagnosis_only',        label: 'Diagnosis only' },
  { value: 'treatment_postponed',   label: 'Postponed' },
  { value: 'follow_up_scheduled',   label: 'Follow-up set' },
  { value: 'patient_declined',      label: 'Patient declined' },
  { value: 'referred',              label: 'Referred elsewhere' },
];

export default function ConsultPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = router.query as { id: string };

  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcome, setOutcome] = useState<ConsultationOutcome>('treatment_done');
  const [completing, setCompleting] = useState(false);

  const { data, isLoading } = useQuery<ConsultContext>({
    queryKey: ['consult-context', id],
    queryFn: () => queueApi.context(id).then(r => r.data),
    enabled: !!id,
  });

  const handleStartConsult = async () => {
    await queueApi.update(id, { status: 'in_consultation' });
    qc.invalidateQueries({ queryKey: ['queue'] });
    router.push(`/patients/${data?.patient.id}/`);
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await queueApi.update(id, { status: 'completed', consultationOutcome: outcome });
      qc.invalidateQueries({ queryKey: ['queue'] });
      router.replace('/home/');
    } finally { setCompleting(false); }
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1C1C1E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { queueEntry: entry, patient, activePlans, lastVisit, todayXrays, pendingBalance } = data;

  return (
    <div className="min-h-screen bg-bg pb-32">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-[17px] font-semibold text-text-primary">Consultation</h1>
        <span className="text-[13px] font-semibold" style={{ color: entry.priority === 'urgent' ? '#FF3B30' : '#6E6E73' }}>
          #{entry.token_number} {entry.priority === 'urgent' ? '· URGENT' : ''}
        </span>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* ── PATIENT HEADER ── */}
        <div className="bg-surface rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white text-base font-bold flex-shrink-0">
              {getInitials(patient.name)}
            </div>
            <div className="flex-1">
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>{patient.name}</p>
              <p style={{ fontSize: 13, color: '#6E6E73' }}>
                {[patient.age && `${patient.age} yrs`, patient.gender, patient.phone].filter(Boolean).join(' · ')}
              </p>
            </div>
            {pendingBalance > 0 && (
              <div className="flex flex-col items-end">
                <span style={{ fontSize: 11, color: '#FF3B30', fontWeight: 600 }}>Outstanding</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#FF3B30' }}>₹{pendingBalance.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
          {lastVisit && (
            <p style={{ fontSize: 12, color: '#AEAEB2' }}>Last visit: {formatDate(lastVisit.visit_date)} · {lastVisit.procedure_name}</p>
          )}
          {/* Medical flags */}
          {patient.allergies && (
            <div className="mt-2 flex items-center gap-2 bg-error-light rounded-xl px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-error flex-shrink-0" />
              <span style={{ fontSize: 13, color: '#FF3B30', fontWeight: 600 }}>Allergy: {patient.allergies}</span>
            </div>
          )}
          {patient.clinical_flags && Object.values(patient.clinical_flags).some(Boolean) && (
            <div className="mt-1.5 flex items-center gap-2 bg-warning-light rounded-xl px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
              <span style={{ fontSize: 13, color: '#CC7A00', fontWeight: 600 }}>
                {Object.entries(patient.clinical_flags).filter(([, v]) => v && typeof v === 'boolean').map(([k]) =>
                  k.replace(/([A-Z])/g, ' $1').replace('is ', '').replace('has ', '')).join(' · ')}
              </span>
            </div>
          )}
        </div>

        {/* ── TODAY'S REASON ── */}
        <div className="bg-surface rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Today's Reason
          </p>
          {entry.chief_complaint ? (
            <p style={{ fontSize: 16, color: '#1C1C1E', lineHeight: 1.5 }}>"{entry.chief_complaint}"</p>
          ) : (
            <p style={{ fontSize: 14, color: '#AEAEB2', fontStyle: 'italic' }}>No complaint recorded</p>
          )}
          {entry.treatment_plans && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(60,60,67,0.08)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1B86B8' }}>
                {entry.treatment_plans.procedure_name} — Sitting {(entry.treatment_plans.completed_sittings || 0) + 1} of {entry.treatment_plans.total_sittings}
              </p>
              <div className="mt-2 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ background: '#1B86B8', width: `${((entry.treatment_plans.completed_sittings || 0) / entry.treatment_plans.total_sittings) * 100}%` }} />
              </div>
            </div>
          )}
          {/* Today's X-rays */}
          {todayXrays.length > 0 && (
            <div className="mt-3 pt-3 border-t flex gap-2" style={{ borderColor: 'rgba(60,60,67,0.08)' }}>
              {todayXrays.map(x => (
                <div key={x.id} className="flex items-center gap-1.5 bg-surface-muted rounded-lg px-2.5 py-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-text-secondary" />
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1C1C1E' }}>{x.xray_type}</span>
                </div>
              ))}
              <span style={{ fontSize: 12, color: '#6E6E73', alignSelf: 'center' }}>uploaded today</span>
            </div>
          )}
        </div>

        {/* ── ACTIVE TREATMENT PLANS ── */}
        {activePlans.length > 0 && (
          <div className="bg-surface rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Active Treatments
            </p>
            {activePlans.map((plan, i) => (
              <div key={plan.id} style={{ borderTop: i > 0 ? '1px solid rgba(60,60,67,0.08)' : 'none', paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0 }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{plan.procedure_name}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#C77700' }}>{plan.completed_sittings}/{plan.total_sittings} sittings</p>
                </div>
                <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                  <div className="h-full bg-[#1C1C1E] rounded-full" style={{ width: `${(plan.completed_sittings / plan.total_sittings) * 100}%` }} />
                </div>
                {plan.pending_amount > 0 && (
                  <p style={{ fontSize: 12, color: '#FF3B30', marginTop: 4 }}>₹{Number(plan.pending_amount).toLocaleString('en-IN')} pending</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── LAST VISIT NOTE ── */}
        {lastVisit?.notes && (
          <div className="bg-surface rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Last Visit · {formatDate(lastVisit.visit_date)}
            </p>
            <p style={{ fontSize: 14, color: '#1C1C1E', lineHeight: 1.5 }}>{lastVisit.notes}</p>
            {lastVisit.medications && (
              <p style={{ fontSize: 13, color: '#6E6E73', marginTop: 4 }}>💊 {lastVisit.medications}</p>
            )}
          </div>
        )}
      </div>

      {/* ── STICKY ACTIONS ── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface border-t border-border px-5 py-4 pb-6 space-y-2.5"
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)' }}>
        <div className="grid grid-cols-3 gap-2.5">
          <AppButton size="sm" onClick={handleStartConsult} fullWidth>Open Profile</AppButton>
          <AppButton size="sm" variant="secondary" fullWidth
            onClick={() => router.push(`/voice/record/?patientId=${patient.id}&patientName=${encodeURIComponent(patient.name)}`)}>
            <Mic className="w-4 h-4 mr-1" /> Record
          </AppButton>
          <AppButton size="sm" variant="secondary" fullWidth onClick={() => setShowOutcomeModal(true)}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Done
          </AppButton>
        </div>
      </div>

      {/* Outcome modal */}
      {showOutcomeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowOutcomeModal(false)}>
          <div className="bg-surface rounded-t-2xl w-full max-w-lg mx-auto p-5 pb-8 space-y-4" onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>Consultation outcome</p>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map(o => (
                <button key={o.value} onClick={() => setOutcome(o.value)}
                  className="h-[44px] rounded-xl text-sm font-semibold press-effect"
                  style={{ background: outcome === o.value ? '#1C1C1E' : '#F2F2F7', color: outcome === o.value ? '#fff' : '#1C1C1E' }}>
                  {o.label}
                </button>
              ))}
            </div>
            <AppButton onClick={handleComplete} isLoading={completing}>Mark Complete</AppButton>
          </div>
        </div>
      )}
    </div>
  );
}
