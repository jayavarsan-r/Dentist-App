import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Mic, Pill, Calendar } from 'lucide-react';
import { visitNotesApi } from '@/lib/api';
import AppButton from '@/components/shared/AppButton';
import EmptyState from '@/components/shared/EmptyState';
import { formatDate } from '@/lib/utils';
import type { VisitNote } from '@/types';

export default function VisitNotesPage() {
  const router = useRouter();
  const { id: visitId, patientId, patientName, visitDate, procedureName } = router.query as {
    id: string; patientId?: string; patientName?: string; visitDate?: string; procedureName?: string;
  };

  const { data, isLoading } = useQuery<{ notes: VisitNote[] }>({
    queryKey: ['visit-notes', visitId],
    queryFn: () => visitNotesApi.list(visitId).then(r => r.data),
    enabled: !!visitId,
  });

  const notes = data?.notes || [];

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-text-primary">{procedureName || 'Visit Notes'}</h1>
            {visitDate && <p className="text-xs text-text-secondary">{formatDate(visitDate)}</p>}
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        {/* Sub-header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">Visit on {visitDate ? formatDate(visitDate) : '—'}</p>
            <p className="text-xs text-text-secondary">{notes.length} note(s) recorded</p>
          </div>
          <button
            onClick={() => router.push(`/voice/record/?patientId=${patientId}&patientName=${encodeURIComponent(patientName || '')}&visitId=${visitId}`)}
            className="flex items-center gap-1.5 bg-accent-light border border-accent text-accent text-sm font-semibold px-3 h-9 rounded-xl press-effect"
          >
            <Mic className="w-4 h-4" /> Add Note
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            icon={Mic}
            title="No notes yet"
            subtitle="Tap '+ Add Note' to record a voice note for this visit"
            ctaLabel="Record Voice Note"
            onCta={() => router.push(`/voice/record/?patientId=${patientId}&patientName=${encodeURIComponent(patientName || '')}&visitId=${visitId}`)}
          />
        ) : (
          <div className="space-y-3">
            {notes.map(note => (
              <div key={note.id} className="bg-surface border border-border rounded-xl overflow-hidden shadow-card">
                {/* Note header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-surface-subtle border-b border-divider">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">{note.note_number}</span>
                    </div>
                    <span className="text-sm font-semibold text-text-primary">Note {note.note_number}</span>
                  </div>
                  {note.cost != null && note.cost > 0 && (
                    <span className="text-sm font-semibold text-success">₹{note.cost.toLocaleString('en-IN')}</span>
                  )}
                </div>

                {/* Note content */}
                <div className="px-4 py-3 space-y-2">
                  {note.procedure_name && (
                    <p className="text-sm font-medium text-text-primary">{note.procedure_name}
                      {note.tooth_number && <span className="ml-1.5 text-xs bg-accent-light text-accent px-1.5 py-0.5 rounded font-normal">Tooth {note.tooth_number}</span>}
                    </p>
                  )}
                  {note.notes && <p className="text-sm text-text-primary leading-relaxed">{note.notes}</p>}
                  {note.medications && (
                    <div className="flex items-center gap-1.5 bg-info-light rounded-lg px-3 py-2">
                      <Pill className="w-3.5 h-3.5 text-info flex-shrink-0" />
                      <span className="text-xs text-info">{note.medications}</span>
                    </div>
                  )}
                  {note.follow_up_date && (
                    <div className="flex items-center gap-1.5 bg-amber-light rounded-lg px-3 py-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-dark flex-shrink-0" />
                      <span className="text-xs text-amber-dark">Follow-up: {formatDate(note.follow_up_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface border-t border-border px-5 py-4 pb-6">
        <AppButton onClick={() => router.push(`/voice/record/?patientId=${patientId}&patientName=${encodeURIComponent(patientName || '')}&visitId=${visitId}`)}>
          <Mic className="w-4 h-4 mr-2" /> Record Voice Note
        </AppButton>
      </div>
    </div>
  );
}
