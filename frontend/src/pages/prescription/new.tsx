import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mic, Square, Trash2, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import AppButton from '@/components/shared/AppButton';
import { aiApi, prescriptionsApi } from '@/lib/api';
import type { PrescriptionMedicine } from '@/types';

function getBestMimeType(): string {
  const types = ['audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/webm;codecs=opus', 'audio/webm'];
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}
function getExt(mimeType: string) {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('mpeg')) return 'mp4';
  return 'webm';
}

export default function NewPrescriptionPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { patientId, patientName } = router.query as { patientId: string; patientName: string };

  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([]);
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMed, setNewMed] = useState<PrescriptionMedicine>({ name: '', dose: null, frequency: null, duration: null, timing: null, instructions: null });
  const [seconds, setSeconds] = useState(0);
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(20).fill(6));

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mimeType] = useState(() => typeof window !== 'undefined' ? getBestMimeType() : 'audio/ogg');

  useEffect(() => {
    if (recording) {
      waveRef.current = setInterval(() => setWaveHeights(Array(20).fill(0).map(() => Math.random() * 28 + 6)), 150);
    } else {
      if (waveRef.current) clearInterval(waveRef.current);
      setWaveHeights(Array(20).fill(6));
    }
    return () => { if (waveRef.current) clearInterval(waveRef.current); };
  }, [recording]);

  const startRecording = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mrRef.current = mr; chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      setRecording(true); setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch { setError('Microphone access denied. Allow microphone and try again.'); }
  }, [mimeType]);

  const stopRecording = useCallback(() => {
    if (!mrRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    mrRef.current.onstop = async () => {
      setProcessing(true);
      const blob = new Blob(chunksRef.current, { type: mrRef.current?.mimeType || mimeType });
      const ext = getExt(mrRef.current?.mimeType || mimeType);
      try {
        const res = await aiApi.transcribe(blob, ext);
        setTranscript(res.data.transcript || '');
      } catch (e: any) { setError(e.message || 'Transcription failed'); }
      finally { setProcessing(false); }
    };
    mrRef.current.stop();
    mrRef.current.stream.getTracks().forEach(t => t.stop());
    setRecording(false);
  }, [mimeType]);

  const handleExtract = async () => {
    if (!transcript.trim()) return;
    setExtracting(true);
    try {
      const res = await prescriptionsApi.create({ patientId, rawVoice: transcript });
      const rx = res.data.prescription;
      setMedicines(rx.medicines || []);
      setInstructions(rx.instructions || '');
    } catch (e: any) { setError(e.message || 'Extraction failed'); }
    finally { setExtracting(false); }
  };

  const handleSave = async () => {
    if (!patientId || medicines.length === 0) {
      setError('Add at least one medicine before saving');
      return;
    }
    setSaving(true);
    try {
      const res = await prescriptionsApi.create({ patientId, rawVoice: transcript, medicines, instructions });
      qc.invalidateQueries({ queryKey: ['patient', patientId] });
      router.replace(`/prescription/${res.data.prescription.id}`);
    } catch (e: any) { setError(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-text-primary">New Prescription</h1>
      </div>

      <div className="px-5 py-5 pb-40 space-y-5">
        {/* Patient chip */}
        <div className="inline-flex items-center gap-2 bg-accent-light border border-accent/30 px-4 py-2 rounded-full">
          <span className="text-sm font-medium text-accent">{patientName || 'Patient'}</span>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-error-light border border-error-border rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Record Section */}
        <section>
          <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-3">Record Prescription</p>
          <div className="rounded-xl p-6 flex flex-col items-center gap-4" style={{ background: '#0A0E1A' }}>
            {processing ? (
              <>
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-white/60">Transcribing…</p>
              </>
            ) : recording ? (
              <>
                <p className="text-3xl font-light text-white tracking-widest">{Math.floor(seconds / 60)}:{pad(seconds % 60)}</p>
                <div className="flex items-center gap-1 h-10">
                  {waveHeights.map((h, i) => (
                    <div key={i} className="w-[3px] rounded-full transition-all duration-100" style={{ height: `${h}px`, background: 'rgba(255,255,255,0.8)' }} />
                  ))}
                </div>
                <button onClick={stopRecording} className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#EF4444', boxShadow: '0 0 24px rgba(239,68,68,0.4)' }}>
                  <Square className="w-8 h-8 text-white fill-white" />
                </button>
                <p className="text-xs text-white/40">Tap to stop</p>
              </>
            ) : (
              <>
                <button onClick={startRecording} className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'radial-gradient(circle, #1B70F8, #1355C4)', boxShadow: '0 0 24px rgba(27,112,248,0.4)' }}>
                  <Mic className="w-8 h-8 text-white" />
                </button>
                <p className="text-xs text-white/40">Tap to record prescription</p>
              </>
            )}
          </div>
        </section>

        {/* Transcript */}
        {transcript && !processing && (
          <section>
            <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-2">Transcript</p>
            <div className="bg-surface-muted rounded-xl p-3">
              <textarea
                value={transcript} onChange={e => setTranscript(e.target.value)}
                rows={4} className="w-full bg-transparent text-sm text-text-primary resize-none focus:outline-none"
              />
            </div>
            <div className="mt-3">
              <AppButton variant="secondary" size="md" onClick={handleExtract} isLoading={extracting}>
                Extract Medicines
              </AppButton>
            </div>
          </section>
        )}

        <div className="border-t border-divider" />

        {/* Medicines */}
        <section>
          <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-3">Medicines</p>
          {medicines.length === 0 && !showAddForm && (
            <p className="text-sm text-text-disabled italic mb-3">No medicines added yet</p>
          )}
          {medicines.map((med, i) => (
            <div key={i} className="bg-surface border border-border rounded-xl px-4 py-3 mb-2.5 flex items-start gap-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-text-primary">{med.name} {med.dose && <span className="font-normal text-text-secondary">{med.dose}</span>}</p>
                <p className="text-[13px] text-text-secondary mt-0.5">{[med.frequency, med.duration && `for ${med.duration}`].filter(Boolean).join(' · ')}</p>
                {med.timing && (
                  <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-[5px]" style={{ background: 'rgba(50,173,230,0.12)', color: '#1B86B8' }}>{med.timing}</span>
                )}
                {med.instructions && <p className="text-[12px] text-text-disabled mt-1">{med.instructions}</p>}
              </div>
              <button onClick={() => setMedicines(m => m.filter((_, j) => j !== i))} className="text-error p-1 mt-0.5">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {showAddForm && (
            <div className="bg-surface-subtle border border-border rounded-xl p-4 mb-3 space-y-3">
              {(['name', 'dose', 'frequency', 'duration', 'timing', 'instructions'] as const).map(field => (
                <div key={field}>
                  <label className="text-[10px] font-semibold text-text-secondary uppercase">{field}</label>
                  <input
                    type="text" value={newMed[field] || ''}
                    onChange={e => setNewMed(m => ({ ...m, [field]: e.target.value || null }))}
                    placeholder={field === 'name' ? 'e.g. Amoxicillin' : field === 'dose' ? '500 mg' : field === 'frequency' ? 'Three times daily' : field === 'duration' ? '5 days' : field === 'timing' ? 'After meals' : 'Take with water'}
                    className="w-full h-9 bg-surface border border-border rounded-lg px-3 text-sm text-text-primary focus:outline-none focus:border-accent mt-1"
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <AppButton variant="secondary" size="sm" onClick={() => { setShowAddForm(false); setNewMed({ name: '', dose: null, frequency: null, duration: null, timing: null, instructions: null }); }} fullWidth={false}>
                  Cancel
                </AppButton>
                <AppButton size="sm" onClick={() => {
                  if (!newMed.name.trim()) return;
                  setMedicines(m => [...m, newMed]);
                  setShowAddForm(false);
                  setNewMed({ name: '', dose: null, frequency: null, duration: null, timing: null, instructions: null });
                }} fullWidth={false}>
                  Add
                </AppButton>
              </div>
            </div>
          )}

          {!showAddForm && (
            <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 text-accent text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Medicine Manually
            </button>
          )}
        </section>

        {/* Instructions */}
        <section>
          <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-2">Additional Instructions</p>
          <textarea
            value={instructions} onChange={e => setInstructions(e.target.value)}
            rows={3} placeholder="e.g. Avoid hot food for 24 hours. Rest well."
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
          />
        </section>
      </div>

      {/* Sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface border-t border-border px-5 py-4 pb-6">
        <AppButton onClick={handleSave} isLoading={saving}>Save &amp; Generate Prescription</AppButton>
      </div>
    </div>
  );
}
