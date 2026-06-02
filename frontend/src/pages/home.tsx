import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import {
  Search, Users, Clock, CheckCircle, AlertTriangle, ChevronRight, Mic
} from 'lucide-react';
import { queueApi, analyticsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import PatientAvatar from '@/components/shared/PatientAvatar';
import EmptyState from '@/components/shared/EmptyState';
import { StatCardShimmer } from '@/components/shared/LoadingShimmer';
import { getInitials, daysBetween, formatDate } from '@/lib/utils';
import type { QueueEntry, DashboardStats } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const { dentist, staff } = useAuthStore();
  const qc = useQueryClient();

  const { data: queueData, isLoading: queueLoading } = useQuery<{ queue: QueueEntry[] }>({
    queryKey: ['queue'],
    queryFn: () => queueApi.list().then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
  });

  const queue = queueData?.queue ?? [];
  const waiting = queue.filter((q) => q.status === 'waiting');
  const inConsult = queue.filter((q) => q.status === 'in_consultation');
  const done = queue.filter((q) => q.status === 'completed');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const displayName = staff?.name || dentist?.name || 'Doctor';

  return (
    <div className="min-h-screen bg-bg">
      <div className="bg-surface border-b border-divider px-5 pt-12 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-text-secondary">{todayStr}</p>
            <h1 className="text-xl font-semibold text-text-primary mt-0.5">
              {greeting}, Dr. {displayName}
            </h1>
          </div>
          <button
            onClick={() => router.push('/settings/')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-accent-light text-accent text-sm font-semibold flex-shrink-0"
          >
            {getInitials(displayName)}
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 pb-6">
        {/* Queue stat strip */}
        {queueLoading || statsLoading ? <StatCardShimmer /> : (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5">
            <StatCard
              icon={<Clock className="w-[18px] h-[18px] text-amber" />}
              value={waiting.length}
              label="Waiting"
              onClick={() => router.push('/queue/')}
            />
            <StatCard
              icon={<Mic className="w-[18px] h-[18px] text-accent" />}
              value={inConsult.length}
              label="In Consult"
              onClick={() => router.push('/queue/')}
            />
            <StatCard
              icon={<CheckCircle className="w-[18px] h-[18px] text-success" />}
              value={done.length}
              label="Done Today"
            />
            <StatCard
              icon={<AlertTriangle className="w-[18px] h-[18px] text-error" />}
              value={stats?.pendingFollowUps ?? 0}
              label="Follow-ups"
              onClick={() => router.push('/followups/')}
            />
          </div>
        )}

        {/* Search bar */}
        <button
          onClick={() => router.push('/patients/?focus=1')}
          className="w-full flex items-center gap-2.5 bg-surface-subtle rounded-full px-4 h-11 mt-4 text-left"
        >
          <Search className="w-[18px] h-[18px] text-text-disabled flex-shrink-0" />
          <span className="text-sm text-text-disabled">Search patients by name or phone...</span>
        </button>

        {/* Today's Queue */}
        <div className="flex items-center justify-between mt-6 mb-3">
          <h2 className="text-base font-semibold text-text-primary">Today&apos;s Queue</h2>
          <button onClick={() => router.push('/queue/')} className="text-sm font-semibold text-accent">
            Full Queue →
          </button>
        </div>

        {queueLoading ? (
          <div className="bg-surface rounded-xl border border-border p-4 text-center text-sm text-text-secondary">Loading…</div>
        ) : queue.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <EmptyState icon={Users} title="Queue is empty" subtitle="Patients added by reception will appear here" />
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Show in-consultation first, then waiting */}
            {[...inConsult, ...waiting].slice(0, 5).map((entry) => (
              <QueueCard
                key={entry.id}
                entry={entry}
                onClick={() => router.push(`/consult/${entry.id}`)}
              />
            ))}
            {queue.length > 5 && (
              <button
                onClick={() => router.push('/queue/')}
                className="w-full py-3 text-sm font-semibold text-accent text-center bg-surface border border-border rounded-xl"
              >
                +{queue.length - 5} more in queue →
              </button>
            )}
          </div>
        )}

        {/* Follow-up Alerts */}
        {(stats?.followups?.length ?? 0) > 0 && (
          <>
            <div className="flex items-center justify-between mt-6 mb-3">
              <h2 className="text-base font-semibold text-text-primary">Follow-up Alerts</h2>
              <button onClick={() => router.push('/followups/')} className="text-xs font-semibold text-error">
                {stats!.pendingFollowUps} pending →
              </button>
            </div>
            <div className="space-y-2">
              {stats!.followups.slice(0, 3).map((fu: any) => {
                const overdueDays = Math.abs(daysBetween(fu.follow_up_date));
                const patientName = fu.patients?.name || fu.patient_name || 'Patient';
                return (
                  <button
                    key={fu.id}
                    onClick={() => router.push(`/patients/${fu.patient_id}/`)}
                    className="w-full flex items-center gap-3 bg-error-light rounded-xl px-4 py-3 border-l-4 border-l-error text-left press-effect"
                  >
                    <PatientAvatar name={patientName} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{patientName}</p>
                      <p className="text-xs font-medium text-error">
                        {overdueDays === 0 ? 'Due today' : `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`}
                      </p>
                      <p className="text-xs text-text-secondary">{fu.procedure_name}</p>
                    </div>
                    <span className="text-text-disabled text-lg">›</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function QueueCard({ entry, onClick }: { entry: QueueEntry; onClick: () => void }) {
  const isInConsult = entry.status === 'in_consultation';
  const patientName = entry.patients?.name || 'Patient';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 bg-surface rounded-xl border shadow-sm px-4 py-3.5 text-left press-effect border-l-4 ${
        isInConsult ? 'border-l-accent border-accent/30' : 'border-l-amber border-border'
      }`}
    >
      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-muted flex-shrink-0">
        <span className="text-xs font-bold text-text-secondary">#{entry.token_number}</span>
      </div>
      <PatientAvatar name={patientName} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{patientName}</p>
        <p className="text-xs text-text-secondary truncate">
          {entry.chief_complaint || (entry.patients?.age ? `${entry.patients.age} yrs` : 'No complaint recorded')}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isInConsult ? (
          <span className="text-[10px] font-semibold bg-accent-light text-accent px-2 py-0.5 rounded-full">In Consult</span>
        ) : (
          <span className="text-[10px] font-semibold bg-amber-light text-amber-dark px-2 py-0.5 rounded-full">
            {entry.priority === 'urgent' ? 'Urgent' : 'Waiting'}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-text-disabled" />
      </div>
    </button>
  );
}

function StatCard({ icon, value, label, onClick }: {
  icon: React.ReactNode; value: number; label: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex-shrink-0 w-[150px] h-[72px] bg-surface border border-border rounded-xl shadow-sm px-4 flex items-center gap-3 disabled:cursor-default"
    >
      {icon}
      <div>
        <p className="text-2xl font-bold text-text-primary leading-none">{value}</p>
        <p className="text-xs text-text-secondary mt-1">{label}</p>
      </div>
    </button>
  );
}
