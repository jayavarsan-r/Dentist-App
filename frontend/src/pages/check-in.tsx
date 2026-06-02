import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Plus, Mic, Square, AlertTriangle } from 'lucide-react';
import { patientsApi, queueApi, aiApi, staffApi } from '@/lib/api';
import AppButton from '@/components/shared/AppButton';
import { getInitials } from '@/lib/utils';
import type { Patient, StaffMember } from '@/types';

type Step = 'search' | 'new-patient' | 'complaint';

function getBestMime() {
  const types = ['audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  for (const t of types) if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  return '';
}
function getExt(m: string) { return m.includes('ogg') ? 'ogg' : m.includes('mp4') || m.includes('mpeg') ? 'mp4' : 'webm'; }

export default function CheckInPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Patient | null>(null);
  const [complaint, setComplaint] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [assignedDoctor, setAssignedDoctor] = useState('');
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // New patient form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newAllergies, setNewAllergies] = useState('');

  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [mimeType] = useState(() => typeof window !== 'undefined' ? getBestMime() : 'audio/ogg');

  const { data: patientsData } = useQuery<{ patients: Patient[] }>({
    queryKey: ['patients', query],
    queryFn: () => patientsApi.list(query || undefined).then(r => r.data),
    enabled: query.length >= 2,
  });

  const { data: staffData } = useQuery<{ staff: StaffMember[] }>({
    queryKey: ['staff'],
    queryFn: () => staffApi.list().then(r => r.data),
  });

  const doctors = (staffData?.staff || []).filter(s => s.role === 'doctor');
  const patients = patientsData?.patients || [];

  const startRec = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mrRef.current = mr; chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      setRecording(true);
    } catch { setError('Microphone access denied'); }
  }, [mimeType]);

  const stopRec = useCallback(() => {
    if (!mrRef.current) return;
    mrRef.current.onstop = async () => {
      setProcessing(true);
      const blob = new Blob(chunksRef.current, { type: mrRef.current?.mimeType || mimeType });
      const ext = getExt(mrRef.current?.mimeType || mimeType);
      try {
        const res = await aiApi.transcribe(blob, ext);
        setComplaint(res.data.transcript || '');
      } catch { setError('Transcription failed'); }
      finally { setProcessing(false); }
    };
    mrRef.current.stop();
    mrRef.current.stream.getTracks().forEach(t => t.stop());
    setRecording(false);
  }, [mimeType]);

  const handleCreatePatient = async () => {
    if (!newName || !newPhone) { setError('Name and phone required'); return; }
    setSaving(true);
    try {
      const res = await patientsApi.create({ name: newName, phone: newPhone, age: newAge ? parseInt(newAge) : null, gender: newGender || null, allergies: newAllergies || null });
      setSelected(res.data.patient);
      setStep('complaint');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleAddToQueue = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await queueApi.add({
        patientId:       selected.id,
        chiefComplaint:  complaint || null,
        priority,
        assignedDoctor:  assignedDoctor || null,
      });
      qc.invalidateQueries({ queryKey: ['queue'] });
      router.push('/reception/');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1"><ArrowLeft className="w-5 h-5 text-text-primary" /></button>
        <h1 className="text-[17px] font-semibold text-text-primary">
          {step === 'search' ? 'Patient Check-in' : step === 'new-patient' ? 'New Patient' : 'Record Complaint'}
        </h1>
      </div>

      <div className="px-5 py-5 space-y-5">
        {error && (
          <div className="flex items-center gap-2 bg-error-light border border-error-border rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-error flex-shrink-0" />
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* ── SEARCH ── */}
        {step === 'search' && (
          <>
            <div className="bg-surface rounded-xl flex items-center gap-3 px-4 h-12" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
              <Search className="w-4 h-4 text-text-secondary flex-shrink-0" />
              <input
                autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search by name or phone…"
                className="flex-1 bg-transparent text-[16px] text-text-primary placeholder:text-text-disabled focus:outline-none"
              />
            </div>

            {query.length >= 2 && (
              <div>
                {patients.length > 0 && (
                  <div className="bg-surface rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
                    {patients.slice(0, 8).map((p, i) => (
                      <button key={p.id} onClick={() => { setSelected(p); setStep('complaint'); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                        style={{ borderTop: i > 0 ? '1px solid rgba(60,60,67,0.08)' : 'none' }}>
                        <div className="w-10 h-10 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {getInitials(p.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</p>
                          <p style={{ fontSize: 13, color: '#6E6E73' }}>{p.phone}{p.age ? ` · ${p.age} yrs` : ''}</p>
                        </div>
                        <span style={{ fontSize: 12, color: '#007AFF', fontWeight: 500 }}>Select</span>
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setStep('new-patient')} className="w-full flex items-center gap-3 mt-3 px-4 py-3 bg-surface rounded-2xl text-left press-effect"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
                  <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0"><Plus className="w-5 h-5 text-text-secondary" /></div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>Add new patient</p>
                    <p style={{ fontSize: 13, color: '#6E6E73' }}>"{query}"</p>
                  </div>
                </button>
              </div>
            )}
          </>
        )}

        {/* ── NEW PATIENT ── */}
        {step === 'new-patient' && (
          <div className="space-y-4">
            <F label="Full name *" value={newName} onChange={setNewName} placeholder="Patient's full name" />
            <F label="Phone *" value={newPhone} onChange={setNewPhone} placeholder="10-digit mobile" type="tel" />
            <div className="grid grid-cols-2 gap-3">
              <F label="Age" value={newAge} onChange={setNewAge} placeholder="e.g. 32" type="number" />
              <div>
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-2">Gender</label>
                <select value={newGender} onChange={e => setNewGender(e.target.value)}
                  className="w-full h-[44px] bg-surface border border-border rounded-xl px-3 text-[15px] focus:outline-none focus:border-[#1C1C1E]">
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <F label="Allergies (optional)" value={newAllergies} onChange={setNewAllergies} placeholder="e.g. Penicillin" />
            <AppButton onClick={handleCreatePatient} isLoading={saving}>Create & Continue</AppButton>
          </div>
        )}

        {/* ── COMPLAINT ── */}
        {step === 'complaint' && selected && (
          <div className="space-y-4">
            {/* Patient chip */}
            <div className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
              <div className="w-10 h-10 rounded-full bg-[#1C1C1E] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {getInitials(selected.name)}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{selected.name}</p>
                <p style={{ fontSize: 13, color: '#6E6E73' }}>{selected.phone}</p>
              </div>
            </div>

            {/* Voice complaint */}
            <div className="rounded-2xl p-5 flex flex-col items-center gap-3" style={{ background: '#0A0E1A' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Record patient's chief complaint</p>
              {processing ? (
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : recording ? (
                <button onClick={stopRec} className="w-16 h-16 rounded-full flex items-center justify-center press-effect" style={{ background: '#FF3B30', boxShadow: '0 0 24px rgba(255,59,48,0.4)' }}>
                  <Square className="w-7 h-7 text-white fill-white" />
                </button>
              ) : (
                <button onClick={startRec} className="w-16 h-16 rounded-full flex items-center justify-center press-effect" style={{ background: 'radial-gradient(circle, #1B70F8, #1355C4)', boxShadow: '0 0 24px rgba(27,112,248,0.4)' }}>
                  <Mic className="w-7 h-7 text-white" />
                </button>
              )}
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{recording ? 'Tap to stop' : 'Tap to record'}</p>
            </div>

            {/* Complaint text */}
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-2">Chief Complaint</label>
              <textarea value={complaint} onChange={e => setComplaint(e.target.value)} rows={3}
                placeholder="e.g. Pain in upper left tooth for 3 days"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:border-[#1C1C1E] resize-none" />
            </div>

            {/* Priority */}
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-2">Priority</label>
              <div className="grid grid-cols-2 gap-2">
                {(['normal', 'urgent'] as const).map(p => (
                  <button key={p} onClick={() => setPriority(p)} className="h-[44px] rounded-xl font-semibold text-sm press-effect"
                    style={{ background: priority === p ? (p === 'urgent' ? '#FFF1F0' : '#1C1C1E') : '#fff', color: priority === p ? (p === 'urgent' ? '#FF3B30' : '#fff') : '#6E6E73', border: priority === p ? (p === 'urgent' ? '1px solid #FF6B60' : 'none') : '1px solid #D1D1D6' }}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Assign doctor */}
            {doctors.length > 1 && (
              <div>
                <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-2">Assign Doctor (optional)</label>
                <select value={assignedDoctor} onChange={e => setAssignedDoctor(e.target.value)}
                  className="w-full h-[44px] bg-surface border border-border rounded-xl px-3 text-[15px] focus:outline-none focus:border-[#1C1C1E]">
                  <option value="">Any available doctor</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name || d.phone}</option>)}
                </select>
              </div>
            )}

            <AppButton onClick={handleAddToQueue} isLoading={saving}>Add to Queue</AppButton>
          </div>
        )}
      </div>
    </div>
  );
}

function F({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block mb-2">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-[44px] bg-surface border border-border rounded-xl px-4 text-[15px] text-text-primary focus:outline-none focus:border-[#1C1C1E] placeholder:text-text-disabled" />
    </div>
  );
}
