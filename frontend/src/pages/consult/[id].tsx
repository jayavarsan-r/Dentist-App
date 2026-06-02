import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mic, CheckCircle2, AlertTriangle, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { queueApi, staffApi } from '@/lib/api';
import AppButton from '@/components/shared/AppButton';
import { formatDate, getInitials } from '@/lib/utils';
import type { ConsultContext, ConsultationOutcome, OutcomeMetadata, StaffMember } from '@/types';

// Maps DB outcome values to user-facing labels and whether extra input is needed
const OUTCOME_CONFIG: {
  value: ConsultationOutcome;
  label: string;
  description: string;
  extraField: 'none' | 'follow_up_days' | 'remaining_sittings' | 'referred_to_doctor' | 'return_date';
  resultStatus: 'ready_for_checkout' | 'completed';
}[] = [
  {
    value: 'treatment_done',
    label: 'Treatment Completed',
    description: 'Procedure done. Patient ready for billing.',
    extraField: 'none',
    resultStatus: 'ready_for_checkout',
  },
  {
    value: 'follow_up_scheduled',
    label: 'Follow-Up Required',
    description: 'Patient needs to return. Reception will schedule.',
    extraField: 'follow_up_days',
    resultStatus: 'ready_for_checkout',
  },
  {
    value: 'additional_sitting_required',
    label: 'Additional Sitting Required',
    description: 'Multi-stage treatment (RCT, implants, braces).',
    extraField: 'remaining_sittings',
    resultStatus: 'ready_for_checkout',
  },
  {
    value: 'referred',
    label: 'Referred To Another Doctor',
    description: 'Transfer to another doctor in this clinic.',
    extraField: 'referred_to_doctor',
    resultStatus: 'completed',
  },
  {
    value: 'diagnosis_only',
    label: 'Consultation Only',
    description: 'No procedure. Direct to payment.',
    extraField: 'none',
    resultStatus: 'ready_for_checkout',
  },
  {
    value: 'treatment_postponed',
    label: 'Treatment Postponed',
    description: 'Patient wants to delay. Reception schedules return.',
    extraField: 'return_date',
    resultStatus: 'ready_for_checkout',
  },
];

const FOLLOW_UP_PRESETS = [7, 14, 30];
const SITTING_PRESETS = [2, 3, 4];

export default function ConsultPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = router.query as { id: string };

  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcome, setOutcome] = useState<ConsultationOutcome>('treatment_done');
  const [completing, setCompleting] = useState(false);

  // Metadata state
  const [followUpDays, setFollowUpDays] = useState<number>(14);
  const [followUpCustom, setFollowUpCustom] = useState('');
  const [remainingSittings, setRemainingSittings] = useState<number>(2);
  const [sittingsCustom, setSittingsCustom] = useState('');
  const [referredDoctorId, setReferredDoctorId] = useState('');
  const [returnDate, setReturnDate] = useState('');

  const { data, isLoading } = useQuery<ConsultContext>({
    queryKey: ['consult-context', id],
    queryFn: () => queueApi.context(id).then(r => r.data),
    enabled: !!id,
  });

  const { data: staffData } = useQuery<{ staff: StaffMember[] }>({
    queryKey: ['staff'],
    queryFn: () => staffApi.list().then(r => r.data),
    enabled: showOutcomeModal,
  });

  const doctors = (staffData?.staff || []).filter(s => s.role === 'doctor');

  const handleStartConsult = async () => {
    await queueApi.update(id, { status: 'in_consultation' });
    qc.invalidateQueries({ queryKey: ['queue'] });
    router.push(`/patients/${data?.patient.id}/`);
  };

  const selectedConfig = OUTCOME_CONFIG.find(c => c.value === outcome)!;

  const buildOutcomeMetadata = (): OutcomeMetadata | null => {
    switch (selectedConfig.extraField) {
      case 'follow_up_days': {
        const days = followUpCustom ? parseInt(followUpCustom) : followUpDays;
        return { follow_up_days: days };
      }
      case 'remaining_sittings': {
        const sittings = sittingsCustom ? parseInt(sittingsCustom) : remainingSittings;
        return { remaining_sittings: sittings };
      }
      case 'referred_to_doctor': {
        const doc = doctors.find(d => d.id === referredDoctorId);
        return {
          referred_to_doctor_id: referredDoctorId,
          referred_to_doctor_name: doc?.name || undefined,
        };
      }
      case 'return_date':
        return { suggested_return_date: returnDate };
      default:
        return null;
    }
  };

  const isMetadataComplete = (): boolean => {
    switch (selectedConfig.extraField) {
      case 'referred_to_doctor': return !!referredDoctorId;
      case 'return_date': return !!returnDate;
      default: return true;
    }
  };

  const handleComplete = async () => {
    if (!isMetadataComplete()) return;
    setCompleting(true);
    try {
      const meta = buildOutcomeMetadata();
      await queueApi.update(id, {
        status: selectedConfig.resultStatus,
        consultationOutcome: outcome,
        outcomeMetadata: meta,
      });

      // If referred: also create a new queue entry for the target doctor
      if (outcome === 'referred' && data && referredDoctorId) {
        await queueApi.add({
          patientId: data.patient.id,
          chiefComplaint: data.queueEntry.chief_complaint,
          assignedDoctor: referredDoctorId,
          priority: data.queueEntry.priority,
          treatmentPlanId: data.queueEntry.treatment_plan_id,
        });
      }

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
            Today&apos;s Reason
          </p>
          {entry.chief_complaint ? (
            <p style={{ fontSize: 16, color: '#1C1C1E', lineHeight: 1.5 }}>&ldquo;{entry.chief_complaint}&rdquo;</p>
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

      {/* ── MANDATORY OUTCOME MODAL ── */}
      {showOutcomeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <div
            className="bg-surface rounded-t-2xl w-full max-w-lg mx-auto pb-8"
            style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'rgba(60,60,67,0.08)' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>Consultation Outcome</p>
              <p style={{ fontSize: 13, color: '#6E6E73', marginTop: 2 }}>
                Select an outcome to complete the consultation.
              </p>
            </div>

            <div className="px-5 pt-4 space-y-4">
              {/* Outcome selector grid */}
              <div className="grid grid-cols-2 gap-2">
                {OUTCOME_CONFIG.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setOutcome(o.value)}
                    className="rounded-xl text-left px-3.5 py-3 press-effect"
                    style={{
                      background: outcome === o.value ? '#1C1C1E' : '#F2F2F7',
                      border: outcome === o.value ? 'none' : '1px solid transparent',
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 600, color: outcome === o.value ? '#fff' : '#1C1C1E' }}>
                      {o.label}
                    </p>
                    <p style={{ fontSize: 11, color: outcome === o.value ? 'rgba(255,255,255,0.55)' : '#AEAEB2', marginTop: 2, lineHeight: 1.4 }}>
                      {o.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Extra field for selected outcome */}
              {selectedConfig.extraField === 'follow_up_days' && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Follow-up in (days)
                  </p>
                  <div className="flex gap-2 mb-2">
                    {FOLLOW_UP_PRESETS.map(d => (
                      <button key={d} onClick={() => { setFollowUpDays(d); setFollowUpCustom(''); }}
                        className="flex-1 h-10 rounded-xl text-sm font-semibold press-effect"
                        style={{ background: followUpDays === d && !followUpCustom ? '#1C1C1E' : '#F2F2F7', color: followUpDays === d && !followUpCustom ? '#fff' : '#1C1C1E' }}>
                        {d}
                      </button>
                    ))}
                    <input
                      type="number" placeholder="Custom"
                      value={followUpCustom}
                      onChange={e => { setFollowUpCustom(e.target.value); setFollowUpDays(0); }}
                      className="flex-1 h-10 rounded-xl text-sm text-center font-semibold bg-surface border border-border focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>
                </div>
              )}

              {selectedConfig.extraField === 'remaining_sittings' && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Remaining Sittings
                  </p>
                  <div className="flex gap-2">
                    {SITTING_PRESETS.map(s => (
                      <button key={s} onClick={() => { setRemainingSittings(s); setSittingsCustom(''); }}
                        className="flex-1 h-10 rounded-xl text-sm font-semibold press-effect"
                        style={{ background: remainingSittings === s && !sittingsCustom ? '#1C1C1E' : '#F2F2F7', color: remainingSittings === s && !sittingsCustom ? '#fff' : '#1C1C1E' }}>
                        {s}
                      </button>
                    ))}
                    <input
                      type="number" placeholder="Custom"
                      value={sittingsCustom}
                      onChange={e => { setSittingsCustom(e.target.value); setRemainingSittings(0); }}
                      className="flex-1 h-10 rounded-xl text-sm text-center font-semibold bg-surface border border-border focus:outline-none focus:border-[#1C1C1E]"
                    />
                  </div>
                </div>
              )}

              {selectedConfig.extraField === 'referred_to_doctor' && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Refer To
                  </p>
                  {doctors.length === 0 ? (
                    <p style={{ fontSize: 13, color: '#AEAEB2' }}>No other doctors found in this clinic.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {doctors.map(doc => (
                        <button key={doc.id} onClick={() => setReferredDoctorId(doc.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl press-effect"
                          style={{ background: referredDoctorId === doc.id ? '#1C1C1E' : '#F2F2F7' }}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: referredDoctorId === doc.id ? 'rgba(255,255,255,0.15)' : '#E5E5EA', color: referredDoctorId === doc.id ? '#fff' : '#1C1C1E' }}>
                            {(doc.name || 'D').charAt(0).toUpperCase()}
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: referredDoctorId === doc.id ? '#fff' : '#1C1C1E' }}>
                            Dr. {doc.name || doc.phone}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedConfig.extraField === 'return_date' && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Suggested Return Date
                  </p>
                  <input
                    type="date"
                    value={returnDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setReturnDate(e.target.value)}
                    className="w-full h-[44px] bg-surface border border-border rounded-xl px-4 text-[15px] text-text-primary focus:outline-none focus:border-[#1C1C1E]"
                  />
                </div>
              )}

              {/* Confirm CTA */}
              <AppButton
                onClick={handleComplete}
                isLoading={completing}
                disabled={!isMetadataComplete()}
              >
                Confirm &amp; Complete Consultation
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
