import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { UserCheck, Clock, AlertCircle, CreditCard, Mic } from 'lucide-react';
import { queueApi, appointmentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatTime12, formatDate } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import type { QueueEntry, Appointment } from '@/types';

function TokenBubble({ n, priority }: { n: number; priority: string }) {
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[15px]"
      style={{ background: priority === 'urgent' ? '#FFF1F0' : '#F2F2F7', color: priority === 'urgent' ? '#FF3B30' : '#1C1C1E' }}>
      {n}
    </div>
  );
}

export default function ReceptionPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { dentist, clinic } = useAuthStore();

  const { data: queueData, refetch } = useQuery<{ queue: QueueEntry[] }>({
    queryKey: ['queue'],
    queryFn: () => queueApi.list().then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: todayData } = useQuery<{ appointments: Appointment[] }>({
    queryKey: ['appointments', 'today'],
    queryFn: () => appointmentsApi.today().then(r => r.data),
  });

  const queue = queueData?.queue || [];
  const waiting = queue.filter(e => e.status === 'waiting');
  const inConsult = queue.filter(e => e.status === 'in_consultation');
  const done = queue.filter(e => e.status === 'completed');
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="min-h-screen bg-bg pb-4">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-14 pb-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-text-secondary">{today}</p>
            <h1 className="text-[28px] font-bold text-text-primary tracking-tight">Reception</h1>
          </div>
          <button
            onClick={() => router.push('/check-in/')}
            className="flex items-center gap-2 h-10 px-4 rounded-xl text-white text-sm font-semibold press-effect"
            style={{ background: '#1C1C1E' }}
          >
            <UserCheck className="w-4 h-4" /> Check-in
          </button>
        </div>

        {/* Stat row */}
        <div className="flex gap-5 mt-4">
          <Stat label="Waiting"       value={waiting.length}  color="#C77700" />
          <Stat label="In consult"    value={inConsult.length} color="#1B86B8" />
          <Stat label="Done"          value={done.length}     color="#1E8E3E" />
          <Stat label="Appointments"  value={todayData?.appointments.length ?? 0} color="#1C1C1E" />
        </div>
      </div>

      <div className="px-5 pt-5 space-y-6">
        {/* Queue */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Today's Queue · {queue.length}
            </p>
            <button onClick={() => router.push('/queue/')} style={{ color: '#007AFF', fontSize: 14, fontWeight: 500 }}>View all</button>
          </div>
          {queue.length === 0 ? (
            <div className="bg-surface rounded-2xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
              <EmptyState icon={Clock} title="Queue is empty" subtitle="Tap Check-in to add patients" />
            </div>
          ) : (
            <div className="bg-surface rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
              {queue.slice(0, 6).map((entry, i) => (
                <button
                  key={entry.id}
                  onClick={() => router.push(`/patients/${entry.patient_id}/`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ borderTop: i > 0 ? '1px solid rgba(60,60,67,0.08)' : 'none' }}
                >
                  <TokenBubble n={entry.token_number} priority={entry.priority} />
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{entry.patients?.name || '—'}</p>
                    {entry.chief_complaint && <p style={{ fontSize: 13, color: '#6E6E73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.chief_complaint}</p>}
                    {entry.treatment_plans && (
                      <p style={{ fontSize: 12, color: '#1B86B8', fontWeight: 500 }}>
                        {entry.treatment_plans.procedure_name} · {entry.treatment_plans.completed_sittings}/{entry.treatment_plans.total_sittings}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={entry.status as any} />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Today's appointments */}
        {(todayData?.appointments?.length ?? 0) > 0 && (
          <section>
            <p className="mb-3" style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Scheduled Today
            </p>
            <div className="bg-surface rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}>
              {todayData!.appointments.slice(0, 5).map((appt, i) => (
                <button
                  key={appt.id}
                  onClick={() => router.push(`/patients/${appt.patient_id}/`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ borderTop: i > 0 ? '1px solid rgba(60,60,67,0.08)' : 'none' }}
                >
                  <div className="w-10 text-center flex-shrink-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{formatTime12(appt.appointment_time)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#1C1C1E' }}>{(appt.patients as any)?.name || '—'}</p>
                    {appt.purpose && <p style={{ fontSize: 13, color: '#6E6E73' }}>{appt.purpose}</p>}
                  </div>
                  <StatusBadge status={appt.status} />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</p>
      <p style={{ fontSize: 11, color: '#6E6E73', marginTop: 1 }}>{label}</p>
    </div>
  );
}
