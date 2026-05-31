import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { CheckCircle2 } from 'lucide-react';
import { visitsApi } from '@/lib/api';
import PatientAvatar from '@/components/shared/PatientAvatar';
import EmptyState from '@/components/shared/EmptyState';
import { PatientListShimmer } from '@/components/shared/LoadingShimmer';
import { daysBetween, formatDate } from '@/lib/utils';
import type { Visit, Patient } from '@/types';

type FollowUpVisit = Visit & { patients: Pick<Patient, 'id' | 'name' | 'phone'> };

const FILTERS = ['All', 'Overdue', 'Due Today', 'This Week'];

export default function FollowUpsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('All');

  const { data, isLoading } = useQuery<{ followups: FollowUpVisit[] }>({
    queryKey: ['followups'],
    queryFn: () => visitsApi.list().then((r) => ({
      followups: r.data.visits?.filter((v: any) => v.follow_up_date && !v.follow_up_done) || []
    })),
  });

  const today = new Date().toISOString().split('T')[0];
  const allFollowups = data?.followups ?? [];

  const filtered = allFollowups.filter((f) => {
    if (filter === 'Overdue') return f.follow_up_date! < today;
    if (filter === 'Due Today') return f.follow_up_date === today;
    if (filter === 'This Week') {
      const diff = daysBetween(f.follow_up_date!);
      return diff >= 0 && diff <= 7;
    }
    return true;
  });

  const markDone = async (visitId: string) => {
    await visitsApi.update(visitId, { followUpDone: true, follow_up_date: null });
    qc.invalidateQueries({ queryKey: ['followups'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="bg-app-surface border-b border-app-border sticky top-0 z-10">
        <div className="px-5 pt-12 pb-3">
          <h1 className="text-[22px] font-bold text-text-primary mb-3">Follow-ups</h1>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-shrink-0 h-9 px-4 rounded-full text-sm font-medium transition-colors ${
                  filter === f ? 'bg-primary text-white' : 'bg-app-surface-variant text-text-secondary border border-app-border'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-3">
        {isLoading ? (
          <PatientListShimmer />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All follow-ups are up to date"
            subtitle="You're on top of your patient care!"
          />
        ) : (
          filtered.map((f) => {
            const days = daysBetween(f.follow_up_date!);
            const isOverdue = days < 0;
            const isDueToday = days === 0;
            return (
              <div key={f.id} className="mb-3 bg-app-surface rounded-md border border-app-border shadow-card">
                <button
                  onClick={() => router.push(`/patients/${f.patient_id}/`)}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left"
                >
                  <PatientAvatar name={(f as any).patients?.name || 'P'} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{(f as any).patients?.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">Review due: {formatDate(f.follow_up_date!)}</p>
                    {isOverdue && (
                      <p className="text-xs font-medium text-error mt-0.5">Overdue by {Math.abs(days)} days</p>
                    )}
                    {isDueToday && (
                      <p className="text-xs font-medium text-warning mt-0.5">Due today</p>
                    )}
                    {!isOverdue && !isDueToday && (
                      <p className="text-xs font-medium text-success mt-0.5">Due in {days} days</p>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      isOverdue ? 'bg-error-light text-error' :
                      isDueToday ? 'bg-warning-light text-warning' :
                      'bg-app-surface-variant text-text-secondary'
                    }`}
                  >
                    {isOverdue ? `${Math.abs(days)}d late` : isDueToday ? 'Today' : `+${days}d`}
                  </span>
                </button>
                <div className="border-t border-app-divider flex divide-x divide-app-divider">
                  <button
                    onClick={() => router.push(`/patients/${f.patient_id}/`)}
                    className="flex-1 py-2 text-xs font-semibold text-text-secondary"
                  >
                    View Patient
                  </button>
                  <button
                    onClick={() => markDone(f.id)}
                    className="flex-1 py-2 text-xs font-semibold text-success"
                  >
                    Mark Done
                  </button>
                  <button
                    onClick={() => router.push(`/appointments/schedule/?patientId=${f.patient_id}&patientName=${encodeURIComponent((f as any).patients?.name || '')}`)}
                    className="flex-1 py-2 text-xs font-semibold text-warning"
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
