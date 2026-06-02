import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { X, Mic, Square, AlertCircle, CheckCircle } from 'lucide-react';
import { aiApi } from '@/lib/api';

type RecordState = 'idle' | 'recording' | 'processing' | 'review';

// Sarvam accepts: wav, mp3, ogg, flac, m4a — NOT webm
// Priority: ogg (Chrome/Firefox) → mp4 (Safari) → webm (last resort)
function getBestMimeType(): string {
  const types = [
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
    'audio/webm;codecs=opus',
    'audio/webm',
  ];
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

function formatTranscript(raw: string): string {
  if (!raw) return '';
  // Capitalise first letter of each sentence
  return raw
    .trim()
    .replace(/([.!?])\s+([a-z])/g, (_, p, l) => `${p} ${l.toUpperCase()}`)
    .replace(/^([a-z])/, (c) => c.toUpperCase());
}

export default function VoiceRecordPage() {
  const router = useRouter();
  const { patientId, patientName, visitId } = router.query as { patientId: string; patientName: string; visitId?: string };

  const [state, setState] = useState<RecordState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [transcriptWarning, setTranscriptWarning] = useState('');
  const [error, setError] = useState('');
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(30).fill(8));
  const [mimeType] = useState(() => (typeof window !== 'undefined' ? getBestMimeType() : 'audio/ogg'));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state === 'recording') {
      waveTimerRef.current = setInterval(() => {
        setWaveHeights(Array(30).fill(0).map(() => Math.random() * 36 + 8));
      }, 150);
    } else {
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
      setWaveHeights(Array(30).fill(8));
    }
    return () => { if (waveTimerRef.current) clearInterval(waveTimerRef.current); };
  }, [state]);

  const startRecording = useCallback(async () => {
    setError('');
    setTranscriptWarning('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = mimeType ? { mimeType } : undefined;
      const mr = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      setState('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError('Microphone access denied. Please allow microphone access and try again.');
    }
  }, [mimeType]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      setState('processing');
      const actualMime = mediaRecorderRef.current?.mimeType || mimeType;
      const ext = getExtension(actualMime);
      const blob = new Blob(chunksRef.current, { type: actualMime });

      try {
        const res = await aiApi.transcribe(blob, ext);
        const { transcript: raw, warning, audioStoragePath, audioFileSizeKb } = res.data;
        const formatted = formatTranscript(raw || '');
        setTranscript(formatted);
        if (warning) setTranscriptWarning(warning);
        // Store audio metadata for note page
        if (audioStoragePath) {
          (window as any).__audioStoragePath = audioStoragePath;
          (window as any).__audioFileSizeKb = audioFileSizeKb;
        }
        setState('review');
      } catch (e: any) {
        setError(e.message || 'Transcription failed. Please try again.');
        setState('idle');
      }
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
  }, [mimeType]);

  const handleGenerate = () => {
    if (!transcript.trim()) return;
    const query: Record<string, string> = { patientId, patientName, transcript };
    if ((window as any).__audioStoragePath) {
      query.audioStoragePath = (window as any).__audioStoragePath;
      query.audioFileSizeKb = String((window as any).__audioFileSizeKb || '');
      delete (window as any).__audioStoragePath;
      delete (window as any).__audioFileSizeKb;
    }
    if (visitId) query.visitId = visitId;
    router.push({ pathname: '/voice/note/', query });
  };

  const pad = (n: number) => n.toString().padStart(2, '0');
  const initials = patientName
    ? patientName.trim().split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'PA';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0E1A' }}>
      {/* AppBar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={() => router.back()} className="text-white/70 p-1">
          <X className="w-6 h-6" />
        </button>
        <p className="text-xs text-white/60">
          {state === 'recording' ? 'Recording…' : state === 'processing' ? 'Transcribing…' : `Recording for ${patientName || 'Patient'}`}
        </p>
        <div className="w-6" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">

        {/* ── IDLE ── */}
        {state === 'idle' && (
          <div className="flex flex-col items-center w-full">
            <div className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-white/10 flex items-center justify-center mb-3">
              <span className="text-2xl font-semibold text-white">{initials}</span>
            </div>
            <p className="text-lg font-semibold text-white mb-1">{patientName || 'Patient'}</p>
            <p className="text-sm text-white/50 mb-16 text-center">Describe the treatment performed today</p>

            {error && (
              <div className="flex items-start gap-2 bg-red-900/40 border border-red-500/40 rounded-lg px-4 py-3 mb-8 max-w-sm">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <button
              onClick={startRecording}
              className="w-24 h-24 rounded-full flex items-center justify-center press-effect"
              style={{
                background: 'radial-gradient(circle, #1B70F8, #1355C4)',
                boxShadow: '0 0 32px rgba(27,112,248,0.5)',
              }}
            >
              <Mic className="w-11 h-11 text-white" />
            </button>
            <p className="text-xs text-white/50 mt-4">Tap to start recording</p>
          </div>
        )}

        {/* ── RECORDING ── */}
        {state === 'recording' && (
          <div className="flex flex-col items-center w-full">
            <p className="text-[40px] font-light text-white tracking-widest mb-10">
              {Math.floor(seconds / 60)}:{pad(seconds % 60)}
            </p>

            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute w-40 h-40 rounded-full" style={{ background: 'rgba(27,112,248,0.15)', animation: 'pulse-ring 2s ease-out infinite' }} />
              <div className="absolute w-32 h-32 rounded-full" style={{ background: 'rgba(27,112,248,0.25)', animation: 'pulse-ring 2s ease-out infinite 0.6s' }} />
              <button
                onClick={stopRecording}
                className="relative w-24 h-24 rounded-full flex items-center justify-center press-effect z-10"
                style={{ background: '#EF4444', boxShadow: '0 0 32px rgba(239,68,68,0.5)' }}
              >
                <Square className="w-11 h-11 text-white fill-white" />
              </button>
            </div>

            <div className="flex items-center gap-1 h-12">
              {waveHeights.map((h, i) => (
                <div key={i} className="w-[3px] rounded-full transition-all duration-100"
                  style={{ height: `${h}px`, background: 'rgba(255,255,255,0.8)' }} />
              ))}
            </div>
            <p className="text-xs text-white/50 mt-4">Tap stop when done speaking</p>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {state === 'processing' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-base text-white/80">Transcribing your note…</p>
            <p className="text-sm text-white/40">Powered by Sarvam AI</p>
          </div>
        )}

        {/* ── REVIEW ── */}
        {state === 'review' && (
          <div className="w-full max-w-lg">
            <div className="bg-app-surface rounded-[20px] p-5 w-full">
              {/* Handle */}
              <div className="w-10 h-1 bg-app-border rounded-full mx-auto mb-4" />

              <div className="flex items-start justify-between mb-1">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Transcript</h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {seconds}s recording · Review and edit before generating note
                  </p>
                </div>
                <button onClick={() => setState('idle')} className="text-text-secondary p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Warning banner if Sarvam had issues */}
              {transcriptWarning && (
                <div className="flex items-start gap-2 bg-warning-light border border-warning-border rounded-md px-3 py-2 mt-3 mb-3">
                  <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-warning">AI transcription issue — showing fallback text. Edit below.</p>
                </div>
              )}

              {!transcriptWarning && transcript && (
                <div className="flex items-center gap-1.5 mt-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <p className="text-xs text-success font-medium">Transcribed by Sarvam AI</p>
                </div>
              )}

              {/* Transcript edit area */}
              <div className="bg-app-surface-variant rounded-md p-4 mt-2">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={7}
                  className="w-full bg-transparent text-sm text-text-primary leading-relaxed resize-none focus:outline-none placeholder:text-text-disabled"
                  placeholder="Your spoken words will appear here…"
                  autoFocus
                />
              </div>

              <p className="text-[11px] text-text-disabled text-right mt-1">
                {transcript.length} characters · {transcript.trim().split(/\s+/).filter(Boolean).length} words
              </p>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setTranscript(''); setState('idle'); }}
                  className="flex-1 h-11 rounded-md border border-primary text-primary text-sm font-semibold press-effect"
                >
                  Re-record
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!transcript.trim()}
                  className="flex-[2] h-11 rounded-md bg-primary text-white text-sm font-semibold press-effect shadow-primary-sm disabled:opacity-50"
                >
                  Generate Note →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
