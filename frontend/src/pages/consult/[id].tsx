import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Mic, Square, CheckCircle2, AlertTriangle, Image as ImageIcon,
  CheckCircle, RotateCcw
} from 'lucide-react';
import { queueApi, staffApi, aiApi } from '@/lib/api';
import AppButton from '@/components/shared/AppButton';
import { formatDate, getInitials } from '@/lib/utils';
import type { ConsultContext, ConsultationOutcome, OutcomeMetadata, StaffMember } from '@/types';

// ── Voice recording helpers ──
type RecordState = 'idle' | 'recording' | 'processing' | 'saved';

function getBestMimeType(): string {
  const types = ['audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/webm;codecs=opus', 'audio/webm'];
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

function getExtension(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('mpeg')) return 'mp4';
  return 'webm';
}

function fmtTranscript(raw: string): string {
  return raw.trim()
    .replace(/([.!?])\s+([a-z])/g, (_, p, l) => `${p} ${l.toUpperCase()}`)
    .replace(/^([a-z])/, c => c.toUpperCase());
}

const pad = (n: number) => n.toString().padStart(2, '0');

// ── Outcome config ──
const OUTCOME_CONFIG: {
  value: ConsultationOutcome;
  label: string;
  description: string;
  extraField: 'none' | 'follow_up_days' | 'remaining_sittings' | 'referred_to_doctor' | 'return_date';
  resultStatus: 'ready_for_checkout' | 'completed';
}[] = [
  { value: 'treatment_done',              label: 'Treatment Completed',        description: 'Procedure done. Patient ready for billing.',        extraField: 'none',                resultStatus: 'ready_for_checkout' },
  { value: 'follow_up_scheduled',         label: 'Follow-Up Required',         description: 'Patient needs to return. Reception will schedule.', extraField: 'follow_up_days',       resultStatus: 'ready_for_checkout' },
  { value: 'additional_sitting_required', label: 'Additional Sitting',         description: 'Multi-stage treatment (RCT, implants, braces).',    extraField: 'remaining_sittings',   resultStatus: 'ready_for_checkout' },
  { value: 'referred',                    label: 'Referred To Doctor',         description: 'Transfer to another doctor in this clinic.',        extraField: 'referred_to_doctor',   resultStatus: 'completed' },
  { value: 'diagnosis_only',              label: 'Consultation Only',          description: 'No procedure. Direct to payment.',                  extraField: 'none',                resultStatus: 'ready_for_checkout' },
  { value: 'treatment_postponed',         label: 'Treatment Postponed',        description: 'Patient wants to delay. Reception schedules.',      extraField: 'return_date',          resultStatus: 'ready_for_checkout' },
];

const FOLLOW_UP_PRESETS = [7, 14, 30];
const SITTING_PRESETS = [2, 3, 4];

export default function ConsultPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = router.query as { id: string };

  // ── Outcome modal ──
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcome, setOutcome] = useState<ConsultationOutcome>('treatment_done');
  const [completing, setCompleting] = useState(false);
  const [followUpDays, setFollowUpDays] = useState<number>(14);
  const [followUpCustom, setFollowUpCustom] = useState('');
  const [remainingSittings, setRemainingSittings] = useState<number>(2);
  const [sittingsCustom, setSittingsCustom] = useState('');
  const [referredDoctorId, setReferredDoctorId] = useState('');
  const [returnDate, setReturnDate] = useState('');

  // ── Voice recording ──
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [transcript, setTranscript] = useState('');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(20).fill(8));
  const [recordError, setRecordError] = useState('');
  const [mimeType] = useState(() => typeof window !== 'undefined' ? getBestMimeType() : 'audio/ogg');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (recordState === 'recording') {
      waveTimerRef.current = setInterval(() => {
        setWaveHeights(Array(20).fill(0).map(() => Math.random() * 32 + 8));
      }, 150);
    } else {
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
      setWaveHeights(Array(20).fill(8));
    }
    return () => { if (waveTimerRef.current) clearInterval(waveTimerRef.current); };
  }, [recordState]);

  const startRecording = useCallback(async () => {
    setRecordError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = mimeType ? { mimeType } : undefined;
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      setRecordState('recording');
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
      setRecordError('Microphone access denied. Please allow microphone access.');
    }
  }, [mimeType]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current.onstop = async () => {
      setRecordState('processing');
      const actualMime = mediaRecorderRef.current?.mimeType || mimeType;
      const ext = getExtension(actualMime);
      const blob = new Blob(chunksRef.current, { type: actualMime });
      try {
        const res = await aiApi.transcribe(blob, ext);
        const raw = res.data.transcript || '';
        const formatted = fmtTranscript(raw);
        setTranscript(formatted);
        if (id && formatted) {
          await queueApi.update(id, { notes: formatted });
          qc.invalidateQueries({ queryKey: ['consult-context', id] });
        }
        setRecordState('saved');
      } catch {
        setRecordError('Transcription failed. Please try again.');
        setRecordState('idle');
      }
    };
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
  }, [mimeType, id, qc]);

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

  const selectedConfig = OUTCOME_CONFIG.find(c => c.value === outcome)!;

  const buildMeta = (): OutcomeMetadata | null => {
    switch (selectedConfig.extraField) {
      case 'follow_up_days':      return { follow_up_days: followUpCustom ? parseInt(followUpCustom) : followUpDays };
      case 'remaining_sittings':  return { remaining_sittings: sittingsCustom ? parseInt(sittingsCustom) : remainingSittings };
      case 'referred_to_doctor': {
        const doc = doctors.find(d => d.id === referredDoctorId);
        return { referred_to_doctor_id: referredDoctorId, referred_to_doctor_name: doc?.name || undefined };
      }
      case 'return_date': return { suggested_return_date: returnDate };
      default: return null;
    }
  };

  const isMetaComplete = () => {
    if (selectedConfig.extraField === 'referred_to_doctor') return !!referredDoctorId;
    if (selectedConfig.extraField === 'return_date') return !!returnDate;
    return true;
  };

  const handleComplete = async () => {
    if (!isMetaComplete()) return;
    setCompleting(true);
    try {
      await queueApi.update(id, {
        status: selectedConfig.resultStatus,
        consultationOutcome: outcome,
        outcomeMetadata: buildMeta(),
      });
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
  const existingNote = entry.notes || '';

  return (
    <div className="min-h-screen bg-bg pb-28">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-text-primary">Consultation</h1>
        <span className="text-[13px] font-semibold" style={{ color: entry.priority === 'urgent' ? '#FF3B30' : '#6E6E73' }}>
          #{entry.token_number}{entry.priority === 'urgent' ? ' · URGENT' : ''}
        </span>
      </div>

      <div className="px-5 pt-5 space-y-4">

        {/* Patient card */}
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
                {Object.entries(patient.clinical_flags)
                  .filter(([, v]) => v && typeof v === 'boolean')
                  .map(([k]) => k.replace(/([A-Z])/g, ' $1').replace('is ', '').replace('has ', ''))
                  .join(' · ')}
              </span>
            </div>
          )}
        </div>

        {/* Today's Reason */}
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
                <div className="h-full rounded-full" style={{
                  background: '#1B86B8',
                  width: `${((entry.treatment_plans.completed_sittings || 0) / entry.treatment_plans.total_sittings) * 100}%`
                }} />
              </div>
            </div>
          )}
          {todayXrays.length > 0 && (
            <div className="mt-3 pt-3 border-t flex gap-2 flex-wrap" style={{ borderColor: 'rgba(60,60,67,0.08)' }}>
              {todayXrays.map(x => (
                <div key={x.id} className="flex items-center gap-1.5 bg-surface-muted rounded-lg px-2.5 py-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-text-secondary" />
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#1C1C1E' }}>{x.xray_type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Treatments */}
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

        {/* Last Visit Note */}
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

        {/* ── VOICE NOTE (inline recording) ── */}
        <div className="bg-surface rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Voice Note
            </p>
            {(recordState === 'saved' || existingNote) && (
              <button
                onClick={() => { setRecordState('idle'); setTranscript(''); setRecordError(''); }}
                className="flex items-center gap-1 press-effect"
                style={{ color: '#6E6E73', fontSize: 12 }}
              >
                <RotateCcw className="w-3 h-3" /> Re-record
              </button>
            )}
          </div>

          {/* IDLE */}
          {recordState === 'idle' && (
            <div className="flex flex-col items-center py-6 px-4">
              {existingNote && (
                <div className="w-full mb-5 rounded-xl px-3.5 py-3" style={{ background: '#F2F2F7' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#1E8E3E' }}>Saved note</span>
                  </div>
                  <p style={{ fontSize: 14, color: '#1C1C1E', lineHeight: 1.5 }}>{existingNote}</p>
                </div>
              )}
              {recordError && (
                <p style={{ fontSize: 13, color: '#FF3B30', marginBottom: 12, textAlign: 'center' }}>{recordError}</p>
              )}
              <button
                onClick={startRecording}
                className="w-20 h-20 rounded-full flex items-center justify-center press-effect"
                style={{ background: '#1C1C1E', boxShadow: '0 4px 20px rgba(0,0,0,0.22)' }}
              >
                <Mic className="w-9 h-9 text-white" />
              </button>
              <p style={{ fontSize: 12, color: '#AEAEB2', marginTop: 10 }}>
                {existingNote ? 'Tap to record a new note' : 'Tap to record a voice note'}
              </p>
            </div>
          )}

          {/* RECORDING */}
          {recordState === 'recording' && (
            <div className="flex flex-col items-center py-6 px-4">
              <p style={{ fontSize: 40, fontWeight: 300, color: '#1C1C1E', letterSpacing: '0.05em', marginBottom: 16 }}>
                {Math.floor(recordSeconds / 60)}:{pad(recordSeconds % 60)}
              </p>
              <div className="relative flex items-center justify-center mb-5">
                <div className="absolute rounded-full" style={{ width: 112, height: 112, background: 'rgba(28,28,30,0.06)', animation: 'pulse-ring 2s ease-out infinite' }} />
                <div className="absolute rounded-full" style={{ width: 90, height: 90, background: 'rgba(28,28,30,0.10)', animation: 'pulse-ring 2s ease-out infinite 0.6s' }} />
                <button
                  onClick={stopRecording}
                  className="relative w-16 h-16 rounded-full flex items-center justify-center press-effect z-10"
                  style={{ background: '#FF3B30', boxShadow: '0 4px 16px rgba(255,59,48,0.35)' }}
                >
                  <Square className="w-7 h-7 text-white fill-white" />
                </button>
              </div>
              <div className="flex items-center gap-1 h-10">
                {waveHeights.map((h, i) => (
                  <div key={i} className="w-[3px] rounded-full transition-all duration-100"
                    style={{ height: `${h}px`, background: '#1C1C1E' }} />
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#AEAEB2', marginTop: 8 }}>Tap stop when done speaking</p>
            </div>
          )}

          {/* PROCESSING */}
          {recordState === 'processing' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-10 h-10 border-2 border-[#1C1C1E] border-t-transparent rounded-full animate-spin" />
              <p style={{ fontSize: 14, color: '#1C1C1E', fontWeight: 500 }}>Transcribing with AI…</p>
              <p style={{ fontSize: 12, color: '#AEAEB2' }}>Powered by Sarvam AI</p>
            </div>
          )}

          {/* SAVED */}
          {recordState === 'saved' && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                <p style={{ fontSize: 13, color: '#1E8E3E', fontWeight: 600 }}>Note saved automatically</p>
              </div>
              <div className="rounded-xl px-3.5 py-3" style={{ background: '#F2F2F7' }}>
                <textarea
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  onBlur={() => { if (id) queueApi.update(id, { notes: transcript }); }}
                  rows={4}
                  className="w-full bg-transparent resize-none focus:outline-none"
                  style={{ fontSize: 14, color: '#1C1C1E', lineHeight: 1.5 }}
                />
              </div>
              <p style={{ fontSize: 11, color: '#AEAEB2', marginTop: 4 }}>
                {recordSeconds}s · {transcript.trim().split(/\s+/).filter(Boolean).length} words
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── STICKY FOOTER ── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface border-t border-border px-5 py-4 pb-6"
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)' }}>
        <AppButton onClick={() => setShowOutcomeModal(true)}>
          <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Consultation Complete
        </AppButton>
      </div>

      {/* ── OUTCOME MODAL ── */}
      {showOutcomeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <div
            className="bg-surface rounded-t-2xl w-full max-w-lg mx-auto pb-8 overflow-y-auto"
            style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.2)', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'rgba(60,60,67,0.08)' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E' }}>Consultation Outcome</p>
              <p style={{ fontSize: 13, color: '#6E6E73', marginTop: 2 }}>Select an outcome to complete the consultation.</p>
            </div>
            <div className="px-5 pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {OUTCOME_CONFIG.map(o => (
                  <button key={o.value} onClick={() => setOutcome(o.value)}
                    className="rounded-xl text-left px-3.5 py-3 press-effect"
                    style={{ background: outcome === o.value ? '#1C1C1E' : '#F2F2F7' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: outcome === o.value ? '#fff' : '#1C1C1E' }}>{o.label}</p>
                    <p style={{ fontSize: 11, color: outcome === o.value ? 'rgba(255,255,255,0.55)' : '#AEAEB2', marginTop: 2, lineHeight: 1.4 }}>{o.description}</p>
                  </button>
                ))}
              </div>

              {selectedConfig.extraField === 'follow_up_days' && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Follow-up in (days)</p>
                  <div className="flex gap-2">
                    {FOLLOW_UP_PRESETS.map(d => (
                      <button key={d} onClick={() => { setFollowUpDays(d); setFollowUpCustom(''); }}
                        className="flex-1 h-10 rounded-xl text-sm font-semibold press-effect"
                        style={{ background: followUpDays === d && !followUpCustom ? '#1C1C1E' : '#F2F2F7', color: followUpDays === d && !followUpCustom ? '#fff' : '#1C1C1E' }}>
                        {d}
                      </button>
                    ))}
                    <input type="number" placeholder="Custom" value={followUpCustom}
                      onChange={e => { setFollowUpCustom(e.target.value); setFollowUpDays(0); }}
                      className="flex-1 h-10 rounded-xl text-sm text-center font-semibold bg-surface border border-border focus:outline-none" />
                  </div>
                </div>
              )}

              {selectedConfig.extraField === 'remaining_sittings' && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Remaining Sittings</p>
                  <div className="flex gap-2">
                    {SITTING_PRESETS.map(s => (
                      <button key={s} onClick={() => { setRemainingSittings(s); setSittingsCustom(''); }}
                        className="flex-1 h-10 rounded-xl text-sm font-semibold press-effect"
                        style={{ background: remainingSittings === s && !sittingsCustom ? '#1C1C1E' : '#F2F2F7', color: remainingSittings === s && !sittingsCustom ? '#fff' : '#1C1C1E' }}>
                        {s}
                      </button>
                    ))}
                    <input type="number" placeholder="Custom" value={sittingsCustom}
                      onChange={e => { setSittingsCustom(e.target.value); setRemainingSittings(0); }}
                      className="flex-1 h-10 rounded-xl text-sm text-center font-semibold bg-surface border border-border focus:outline-none" />
                  </div>
                </div>
              )}

              {selectedConfig.extraField === 'referred_to_doctor' && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Refer To</p>
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
                          <p style={{ fontSize: 14, fontWeight: 600, color: referredDoctorId === doc.id ? '#fff' : '#1C1C1E' }}>Dr. {doc.name || doc.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedConfig.extraField === 'return_date' && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Suggested Return Date</p>
                  <input type="date" value={returnDate} min={new Date().toISOString().split('T')[0]}
                    onChange={e => setReturnDate(e.target.value)}
                    className="w-full h-[44px] bg-surface border border-border rounded-xl px-4 text-[15px] text-text-primary focus:outline-none focus:border-[#1C1C1E]" />
                </div>
              )}

              <AppButton onClick={handleComplete} isLoading={completing} disabled={!isMetaComplete()}>
                Confirm &amp; Complete Consultation
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
