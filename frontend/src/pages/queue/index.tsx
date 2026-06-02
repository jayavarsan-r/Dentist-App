import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { ArrowLeft, UserCheck } from 'lucide-react';
import { queueApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import type { QueueEntry } from '@/types';

const OUTCOME_LABELS: Record<string, string> = {
  diagnosis_only: 'Diagnosis only', treatment_done: 'Treatment done',
  treatment_postponed: 'Postponed', patient_declined: 'Declined',
  referred: 'Referred', follow_up_scheduled: 'Follow-up set',
};

export default function QueuePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { role } = useAuthStore();

  const { data, isLoading, refetch } = useQuery<{ queue: QueueEntry[] }>({
    queryKey: ['queue'],
    queryFn: () => queueApi.list().then(r => r.data),
    refetchInterval: 20000,
  });

  const queue = data?.queue || [];
  const waiting     = queue.filter(e => e.status === 'waiting');
  const inConsult   = queue.filter(e => e.status === 'in_consultation');
  const done        = queue.filter(e => e.status === 'completed' || e.status === 'skipped');

  const updateStatus = async (id: string, status: string) => {
    await queueApi.update(id, { status });
    qc.invalidateQueries({ queryKey: ['queue'] });
  };

  const QueueCard = ({ entry }: { entry: QueueEntry }) => (
    <div key={entry.id} className="bg-surface rounded-2xl overflow-hidden mb-2.5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Token */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] flex-shrink-0"
          style={{ background: entry.priority === 'urgent' ? '#FFF1F0' : '#F2F2F7', color: entry.priority === 'urgent' ? '#FF3B30' : '#1C1C1E' }}>
          {entry.token_number}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 16, fontWeight: 600, color: '#1C1C1E' }}>{entry.patients?.name || '—'}</p>
          {entry.chief_complaint && <p style={{ fontSize: 13, color: '#6E6E73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.chief_complaint}</p>}
          {entry.treatment_plans && (
            <p style={{ fontSize: 12, color: '#1B86B8', fontWeight: 500 }}>
              {entry.treatment_plans.procedure_name} · {entry.treatment_plans.completed_sittings}/{entry.treatment_plans.total_sittings} sittings
            </p>
          )}
          {entry.assigned_doctor_staff?.name && (
            <p style={{ fontSize: 12, color: '#6E6E73' }}>Dr. {entry.assigned_doctor_staff.name}</p>
          )}
        </div>
        <StatusBadge status={entry.status as any} />
      </div>

      {/* Actions */}
      <div className="border-t flex divide-x" style={{ borderColor: 'rgba(60,60,67,0.08)' }}>
        {role === 'doctor' && entry.status === 'waiting' && (
          <>
            <button onClick={() => { updateStatus(entry.id, 'in_consultation'); router.push(`/consult/${entry.id}/`); }}
              className="flex-1 py-2.5 text-xs font-semibold text-white flex items-center justify-center gap-1.5"
              style={{ background: '#1C1C1E' }}>
              Start
            </button>
            <button onClick={() => updateStatus(entry.id, 'skipped')}
              className="flex-1 py-2.5 text-xs font-semibold text-text-secondary flex items-center justify-center">
              Skip
            </button>
          </>
        )}
        {role === 'doctor' && entry.status === 'in_consultation' && (
          <button onClick={() => router.push(`/consult/${entry.id}/`)}
            className="flex-1 py-2.5 text-xs font-semibold text-white flex items-center justify-center"
            style={{ background: '#1B86B8' }}>
            Continue →
          </button>
        )}
        {role === 'receptionist' && (
          <>
            <button onClick={() => router.push(`/patients/${entry.patient_id}/`)}
              className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center" style={{ color: '#007AFF' }}>
              Profile
            </button>
            {entry.status === 'waiting' && (
              <button onClick={() => updateStatus(entry.id, 'skipped')}
                className="flex-1 py-2.5 text-xs font-semibold text-text-secondary flex items-center justify-center">
                Remove
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg pb-4">
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-[17px] font-semibold text-text-primary">Queue</h1>
        </div>
        {role === 'receptionist' && (
          <button onClick={() => router.push('/check-in/')} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-white text-xs font-semibold" style={{ background: '#1C1C1E' }}>
            <UserCheck className="w-3.5 h-3.5" /> Check-in
          </button>
        )}
      </div>

      <div className="px-5 pt-5">
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-[#1C1C1E] border-t-transparent rounded-full animate-spin" /></div>
        ) : queue.length === 0 ? (
          <EmptyState icon={UserCheck} title="Queue is empty" subtitle={role === 'receptionist' ? 'Tap Check-in to add patients' : 'No patients in queue today'} />
        ) : (
          <>
            {waiting.length > 0 && (
              <section className="mb-6">
                <p className="mb-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Waiting · {waiting.length}</p>
                {waiting.map(e => <QueueCard key={e.id} entry={e} />)}
              </section>
            )}
            {inConsult.length > 0 && (
              <section className="mb-6">
                <p className="mb-3 text-[11px] font-semibold text-[#1B86B8] uppercase tracking-wider">In Consultation · {inConsult.length}</p>
                {inConsult.map(e => <QueueCard key={e.id} entry={e} />)}
              </section>
            )}
            {done.length > 0 && (
              <section>
                <p className="mb-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Done · {done.length}</p>
                {done.map(e => <QueueCard key={e.id} entry={e} />)}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
