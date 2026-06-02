import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Share2, Printer } from 'lucide-react';
import { prescriptionsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Prescription } from '@/types';

function generatePrescriptionText(rx: Prescription): string {
  const patient = rx.patients;
  const dentist = rx.dentists;
  const lines = [
    `PRESCRIPTION`,
    `${dentist?.clinic_name || 'Dental Clinic'} — Dr. ${dentist?.name || 'Doctor'}`,
    ``,
    `Patient: ${patient?.name || '—'}  |  Age: ${patient?.age || '—'}  |  ${patient?.gender || ''}`,
    `Date: ${formatDate(rx.created_at)}`,
    ``,
    `Rx`,
    ``,
    ...rx.medicines.map((m, i) => [
      `${i + 1}. ${m.name} ${m.dose || ''}`,
      `   ${m.frequency || ''} for ${m.duration || ''}`,
      m.instructions ? `   (${m.instructions})` : '',
    ].filter(Boolean).join('\n')),
    ``,
    rx.instructions ? `Instructions: ${rx.instructions}` : '',
  ].filter(l => l !== undefined);
  return lines.join('\n');
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
    const text = generatePrescriptionText(rx);
    if (navigator.share) navigator.share({ title: 'Prescription', text });
    else navigator.clipboard?.writeText(text);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!rx) return null;

  const patient = rx.patients;
  const dentist = rx.dentists;

  return (
    <div className="min-h-screen bg-surface-muted">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center justify-between print:hidden">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-text-primary">Prescription</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleShare} className="p-2 text-accent">
            <Share2 className="w-5 h-5" />
          </button>
          <button onClick={handlePrint} className="p-2 text-accent">
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Prescription Card */}
      <div className="m-4 bg-surface rounded-2xl border-2 border-border shadow-elevated overflow-hidden print:m-0 print:rounded-none print:border-none print:shadow-none">
        {/* Clinic Header */}
        <div className="px-5 py-4 text-white" style={{ background: 'linear-gradient(135deg, #5F7A61, #0891B2)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{dentist?.clinic_name || 'Dental Clinic'}</h2>
              <p className="text-sm text-white/80">Dr. {dentist?.name || 'Doctor'}</p>
              {dentist?.phone && <p className="text-xs text-white/60">{dentist.phone}</p>}
            </div>
            <span className="text-4xl text-white/30">✚</span>
          </div>
        </div>

        {/* Patient Info */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">Patient: {patient?.name || '—'}</p>
              <p className="text-xs text-text-secondary">Age: {patient?.age || '—'} | {patient?.gender || '—'}</p>
            </div>
            <p className="text-xs text-text-secondary">{formatDate(rx.created_at)}</p>
          </div>
          <div className="border-t border-divider mt-3" />
        </div>

        {/* Rx Symbol + Medicines */}
        <div className="px-5 pb-4">
          <p className="text-3xl font-light text-accent italic mb-4" style={{ fontStyle: 'italic' }}>Rx</p>
          {rx.medicines.length === 0 ? (
            <p className="text-sm text-text-disabled italic">No medicines recorded</p>
          ) : (
            <div className="space-y-4">
              {rx.medicines.map((med, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{med.name}</p>
                    <p className="text-sm text-text-secondary">
                      {[med.dose, med.frequency, med.duration && `for ${med.duration}`].filter(Boolean).join(' — ')}
                    </p>
                    {med.instructions && (
                      <p className="text-xs text-text-disabled">({med.instructions})</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        {rx.instructions && (
          <div className="px-5 pb-4">
            <div className="border-t border-divider mb-3" />
            <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-1.5">Instructions</p>
            <p className="text-sm text-text-primary leading-relaxed">{rx.instructions}</p>
          </div>
        )}

        {/* Signature area */}
        <div className="px-5 pb-6">
          <div className="border-t border-divider pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-disabled">Doctor's Signature</p>
              <div className="w-28 border-b border-text-disabled" />
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 px-4 pb-8 print:hidden">
        <button
          onClick={handleShare}
          className="flex-1 h-12 rounded-xl bg-accent-light border border-accent text-accent text-sm font-semibold flex items-center justify-center gap-2 press-effect"
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 h-12 rounded-xl bg-accent text-white text-sm font-semibold flex items-center justify-center gap-2 press-effect shadow-primary-sm"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
