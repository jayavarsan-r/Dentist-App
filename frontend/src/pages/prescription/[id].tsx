import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Share2, Printer, Pill, Clock, Calendar } from 'lucide-react';
import { prescriptionsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Prescription, PrescriptionMedicine } from '@/types';

// Timing color dots
const TIMING_STYLE: Record<string, { color: string; bg: string }> = {
  'Before meals':     { color: '#1B86B8', bg: 'rgba(50,173,230,0.12)' },
  'After meals':      { color: '#1E8E3E', bg: 'rgba(52,199,89,0.12)' },
  'With meals':       { color: '#1E8E3E', bg: 'rgba(52,199,89,0.12)' },
  'At bedtime':       { color: '#9333C7', bg: 'rgba(191,90,242,0.12)' },
  'On empty stomach': { color: '#C77700', bg: 'rgba(255,159,10,0.12)' },
  'As needed':        { color: '#6E6E73', bg: 'rgba(60,60,67,0.08)' },
};

function TimingTag({ timing }: { timing: string | null }) {
  if (!timing) return null;
  const style = TIMING_STYLE[timing] || { color: '#6E6E73', bg: 'rgba(60,60,67,0.08)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: style.bg, color: style.color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
      <Clock size={10} /> {timing}
    </span>
  );
}

function MedicineRow({ med, index }: { med: PrescriptionMedicine; index: number }) {
  return (
    <div style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(60,60,67,0.08)' }}>
      {/* Number bubble */}
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1C1C1E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + dose */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>{med.name}</span>
          {med.dose && <span style={{ fontSize: 14, fontWeight: 500, color: '#6E6E73' }}>{med.dose}</span>}
        </div>
        {/* Frequency + duration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          {med.frequency && (
            <span style={{ fontSize: 13, color: '#1C1C1E', fontWeight: 500 }}>{med.frequency}</span>
          )}
          {med.frequency && med.duration && <span style={{ color: '#D1D1D6' }}>·</span>}
          {med.duration && (
            <span style={{ fontSize: 13, color: '#6E6E73' }}>for {med.duration}</span>
          )}
        </div>
        {/* Timing tag */}
        {med.timing && <div style={{ marginBottom: 6 }}><TimingTag timing={med.timing} /></div>}
        {/* Instructions */}
        {med.instructions && (
          <p style={{ fontSize: 12, color: '#6E6E73', lineHeight: 1.5, margin: 0 }}>{med.instructions}</p>
        )}
      </div>
    </div>
  );
}

function generateShareText(rx: Prescription): string {
  const p = rx.patients;
  const d = rx.dentists;
  const lines = [
    `━━━ PRESCRIPTION ━━━`,
    `${d?.clinic_name || 'Dental Clinic'}`,
    `Dr. ${d?.name || 'Doctor'}${d?.phone ? ' · ' + d.phone : ''}`,
    ``,
    `Patient: ${p?.name || '—'}`,
    `Age: ${p?.age || '—'} | Gender: ${p?.gender || '—'}`,
    `Date: ${formatDate(rx.created_at)}`,
    ``,
    `Rx`,
    ``,
    ...rx.medicines.map((m, i) => [
      `${i + 1}. ${m.name}${m.dose ? ' ' + m.dose : ''}`,
      `   ${[m.frequency, m.duration && 'for ' + m.duration].filter(Boolean).join(' · ')}`,
      m.timing ? `   ⏰ ${m.timing}` : '',
      m.instructions ? `   ℹ ${m.instructions}` : '',
    ].filter(Boolean).join('\n')),
    rx.instructions ? [``, `Instructions:`, rx.instructions] : [],
    rx.follow_up ? [``, `Follow-up: ${rx.follow_up}`] : [],
    ``,
    `━━━━━━━━━━━━━━━━━━━`,
  ].flat().join('\n');
  return lines;
}

export default function PrescriptionViewPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };

  const { data, isLoading } = useQuery<{ prescription: Prescription }>({
    queryKey: ['prescription', id],
    queryFn: () => prescriptionsApi.getById(id).then(r => r.data),
    enabled: !!id,
  });

  const rx = data?.prescription;

  const handleShare = () => {
    if (!rx) return;
    const text = generateShareText(rx);
    if (navigator.share) navigator.share({ title: 'Prescription', text });
    else if (navigator.clipboard) navigator.clipboard.writeText(text);
  };

  if (isLoading || !id) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1C1C1E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!rx) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-[17px] font-semibold">Prescription</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <Pill className="w-12 h-12 text-text-disabled mb-3" />
          <p className="text-[17px] font-semibold text-text-primary mb-1">Prescription not found</p>
          <button onClick={() => router.back()} className="mt-4 text-[#007AFF] text-sm font-medium">Go Back</button>
        </div>
      </div>
    );
  }

  const patient = rx.patients;
  const dentist = rx.dentists;
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen" style={{ background: '#F2F2F7' }}>
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center justify-between print:hidden">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-[17px] font-semibold text-text-primary">Prescription</h1>
        <div className="flex items-center gap-1">
          <button onClick={handleShare} className="p-2 text-[#007AFF]"><Share2 className="w-[20px] h-[20px]" /></button>
          <button onClick={() => window.print()} className="p-2 text-[#007AFF]"><Printer className="w-[20px] h-[20px]" /></button>
        </div>
      </div>

      <div className="px-4 py-4 pb-8">
        {/* Prescription Card */}
        <div className="bg-surface rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>

          {/* Clinic header strip */}
          <div className="px-5 py-4" style={{ background: '#1C1C1E' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  {dentist?.clinic_name || 'Dental Clinic'}
                </p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.70)', marginTop: 2 }}>
                  Dr. {dentist?.name || 'Doctor'}
                </p>
                {dentist?.phone && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)', marginTop: 1 }}>{dentist.phone}</p>
                )}
              </div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>✚</span>
              </div>
            </div>
          </div>

          {/* Patient info row */}
          <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(60,60,67,0.10)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>
                  {patient?.name || '—'}
                </p>
                <p style={{ fontSize: 13, color: '#6E6E73', marginTop: 2 }}>
                  {[patient?.age && `${patient.age} yrs`, patient?.gender].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6E6E73' }}>
                <Calendar size={12} />
                <span style={{ fontSize: 12 }}>{formatDate(rx.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Rx symbol */}
          <div className="px-5 pt-4">
            <p style={{ fontSize: 28, fontWeight: 300, color: '#1C1C1E', fontStyle: 'italic', marginBottom: 4, fontFamily: 'Georgia, serif' }}>
              Rx
            </p>

            {/* Medicines */}
            {rx.medicines.length === 0 ? (
              <p style={{ fontSize: 14, color: '#AEAEB2', fontStyle: 'italic', padding: '16px 0' }}>No medicines recorded</p>
            ) : (
              <div>
                {rx.medicines.map((med, i) => (
                  <MedicineRow key={i} med={med} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* General instructions */}
          {rx.instructions && (
            <div className="px-5 pt-3 pb-4" style={{ borderTop: '1px solid rgba(60,60,67,0.08)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Instructions
              </p>
              <p style={{ fontSize: 14, color: '#1C1C1E', lineHeight: 1.6 }}>{rx.instructions}</p>
            </div>
          )}

          {/* Follow-up */}
          {rx.follow_up && (
            <div className="px-5 pb-4" style={{ borderTop: '1px solid rgba(60,60,67,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 12 }}>
                <Calendar size={14} color="#C77700" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#C77700' }}>{rx.follow_up}</span>
              </div>
            </div>
          )}

          {/* Doctor signature area */}
          <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(60,60,67,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, color: '#AEAEB2', fontWeight: 500 }}>Doctor's Signature</p>
            <div style={{ width: 100, borderBottom: '1px solid #D1D1D6' }} />
          </div>
        </div>

        {/* Timing legend */}
        <div className="mt-4 px-1">
          <p style={{ fontSize: 11, color: '#AEAEB2', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Timing Guide</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(TIMING_STYLE).map(([label, style]) => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: style.bg, color: style.color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6 }}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-5 print:hidden">
          <button
            onClick={handleShare}
            style={{ flex: 1, height: 52, borderRadius: 14, background: '#FFFFFF', border: '1px solid #D1D1D6', color: '#1C1C1E', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            className="press-effect"
          >
            <Share2 size={16} /> Share
          </button>
          <button
            onClick={() => window.print()}
            style={{ flex: 1, height: 52, borderRadius: 14, background: '#1C1C1E', color: '#FFFFFF', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            className="press-effect"
          >
            <Printer size={16} /> Print / PDF
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
