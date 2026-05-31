import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import { X, Sparkles, ChevronDown, ChevronUp, Mic, Calendar } from 'lucide-react';
import AppButton from '@/components/shared/AppButton';
import { aiApi, visitsApi, appointmentsApi } from '@/lib/api';
import type { StructuredNote } from '@/types';

const STATUS_OPTIONS = ['completed', 'in_progress', 'pending'] as const;

export default function CaseNotePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { patientId, patientName, transcript: rawTranscript } = router.query as {
    patientId: string; patientName: string; transcript: string;
  };

  const [note, setNote] = useState<StructuredNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('10:00');
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!rawTranscript) return;
    aiApi.generateNote(rawTranscript).then((r) => {
      const s = r.data.structured as StructuredNote;
      setNote(s);
      if (s.followUpDate) {
        setScheduleFollowUp(true);
        setFollowUpDate(s.followUpDate);
      }
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [rawTranscript]);

  const setField = (k: keyof StructuredNote, v: any) => setNote((n) => n ? { ...n, [k]: v } : n);

  const handleSave = async () => {
    if (!note || !patientId) return;
    setSaving(true);
    try {
      await visitsApi.create({
        patientId,
        procedureName: note.procedure,
        toothNumber: note.toothNumber,
        status: note.status,
        rawTranscript,
        notes: note.notes,
        medications: note.medications,
        nextSteps: note.nextSteps,
        followUpDate: scheduleFollowUp ? followUpDate : null,
      });

      if (scheduleFollowUp && followUpDate && followUpTime) {
        await appointmentsApi.create({
          patientId,
          appointmentDate: followUpDate,
          appointmentTime: followUpTime,
          purpose: `Follow-up: ${note.procedure}`,
        });
      }

      qc.invalidateQueries({ queryKey: ['patient', patientId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      router.replace(`/patients/${patientId}/`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-secondary">Generating AI note...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg">
      {/* AppBar */}
      <div className="bg-app-surface border-b border-app-border px-5 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
            <X className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Case Note</h1>
        </div>
      </div>

      <div className="px-5 py-5 pb-40 space-y-4">
        {error && <div className="bg-error-light border border-error-border rounded-md p-3 text-sm text-error">{error}</div>}

        {/* AI Note Card */}
        {note && (
          <div className="bg-app-surface rounded-lg border border-app-border shadow-elevated overflow-hidden">
            {/* Top accent */}
            <div className="h-[5px]" style={{ background: 'linear-gradient(90deg, #1B70F8, #0891B2)' }} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <p className="text-base font-semibold text-text-primary">AI Generated Note</p>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-primary-surface rounded-full">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-medium text-primary">AI</span>
                </div>
              </div>

              <NoteField label="Procedure" value={note.procedure} onChange={(v) => setField('procedure', v)} />
              <NoteField label="Tooth Number" value={note.toothNumber || ''} onChange={(v) => setField('toothNumber', v)} placeholder="—" />

              <div className="mb-4">
                <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase mb-2">Status</p>
                <select
                  value={note.status}
                  onChange={(e) => setField('status', e.target.value)}
                  className="w-full h-10 bg-app-surface-variant rounded-md px-3 text-sm text-text-primary border border-app-border focus:outline-none focus:border-primary"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
                <div className="h-px bg-app-divider mt-4" />
              </div>

              <NoteField label="Notes" value={note.notes} onChange={(v) => setField('notes', v)} multiline />
              <NoteField label="Medications" value={note.medications || ''} onChange={(v) => setField('medications', v)} placeholder="None" />
              <NoteField label="Next Steps" value={note.nextSteps || ''} onChange={(v) => setField('nextSteps', v)} placeholder="None" />
            </div>
          </div>
        )}

        {/* Follow-up Suggestion */}
        {note?.followUpDate && (
          <div className="bg-warning-light border border-warning-border rounded-md">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-warning/15 rounded-md flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Schedule Follow-up</p>
                  <p className="text-xs text-warning">Suggested: {note.followUpDate}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={scheduleFollowUp} onChange={(e) => setScheduleFollowUp(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-app-border peer-focus:ring-2 peer-focus:ring-warning rounded-full peer peer-checked:bg-warning after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
            {scheduleFollowUp && (
              <div className="px-4 pb-3 flex gap-3">
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="flex-1 h-10 bg-app-surface border border-app-border rounded-md px-3 text-sm focus:outline-none focus:border-warning"
                />
                <input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="flex-1 h-10 bg-app-surface border border-app-border rounded-md px-3 text-sm focus:outline-none focus:border-warning"
                />
              </div>
            )}
          </div>
        )}

        {/* Original Transcript */}
        <div className="bg-app-surface rounded-md border border-app-border">
          <button
            onClick={() => setShowTranscript((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Mic className="w-4.5 h-4.5 text-primary" />
              <span className="text-sm font-medium text-primary">Original Transcript</span>
            </div>
            {showTranscript ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
          </button>
          {showTranscript && (
            <div className="px-4 pb-4">
              <div className="bg-app-surface-variant rounded-md p-3">
                <p className="text-xs text-text-secondary leading-relaxed">{rawTranscript}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-app-surface border-t border-app-border px-5 py-4 pb-6 space-y-2">
        <AppButton onClick={handleSave} isLoading={saving}>
          {scheduleFollowUp ? 'Save & Schedule' : 'Save Visit Note'}
        </AppButton>
        {scheduleFollowUp && (
          <AppButton variant="ghost" onClick={() => { setScheduleFollowUp(false); handleSave(); }} size="md">
            Save Without Scheduling
          </AppButton>
        )}
      </div>
    </div>
  );
}

function NoteField({ label, value, onChange, multiline, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase mb-1.5">{label}</p>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder || '—'}
          className="w-full text-base text-text-primary bg-transparent resize-none focus:outline-none placeholder:text-text-disabled"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '—'}
          className="w-full text-base text-text-primary bg-transparent focus:outline-none placeholder:text-text-disabled"
        />
      )}
      <div className="h-px bg-app-divider mt-3" />
    </div>
  );
}
