import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { CalendarDays, RotateCcw, CheckCircle2, XCircle, Edit2 } from 'lucide-react';
import { appointmentsApi } from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { PatientListShimmer } from '@/components/shared/LoadingShimmer';
import { formatTime12 } from '@/lib/utils';
import type { Appointment } from '@/types';

const TABS = ['Today', 'Upcoming', 'Missed'];

export default function UpcomingPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const qc = useQueryClient();

  const { data: todayData, isLoading: todayLoading, refetch: refetchToday } = useQuery<{ appointments: Appointment[] }>({
    queryKey: ['appointments', 'today'],
    queryFn: () => appointmentsApi.today().then((r) => r.data),
  });

  const { data: upcomingData, isLoading: upcomingLoading } = useQuery<{ appointments: Appointment[] }>({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => appointmentsApi.upcoming().then((r) => r.data),
  });

  const updateStatus = async (id: string, status: string) => {
    await appointmentsApi.update(id, { status });
    refetchToday();
    qc.invalidateQueries({ queryKey: ['appointments'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const today = new Date().toISOString().split('T')[0];
  const allUpcoming = upcomingData?.appointments ?? [];
  const upcomingOnly = allUpcoming.filter((a) => a.appointment_date > today && a.status === 'scheduled');
  const missed = allUpcoming.filter((a) => a.status === 'missed');
  const todayList = todayData?.appointments ?? [];

  const lists = [todayList, upcomingOnly, missed];
  const loadings = [todayLoading, upcomingLoading, upcomingLoading];

  return (
    <div className="min-h-screen bg-app-bg">
      {/* AppBar */}
      <div className="bg-app-surface border-b border-app-border sticky top-0 z-10">
        <div className="px-5 pt-12 pb-0">
          <h1 className="text-[22px] font-bold text-text-primary mb-3">Schedule</h1>
          <div className="flex border-b border-app-border">
            {TABS.map((t, i) => (
              <button
                key={t}
                onClick={() => setTab(i)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === i ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'
                }`}
              >
                {t}
                {i === 0 && todayList.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-primary text-white rounded-full px-1.5 py-0.5">
                    {todayList.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-3">
        {loadings[tab] ? (
          <PatientListShimmer />
        ) : lists[tab].length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={tab === 2 ? 'No missed appointments' : 'No appointments'}
            subtitle={tab === 0 ? "You're free today!" : tab === 1 ? 'No upcoming appointments this week' : 'Great job keeping up!'}
          />
        ) : (
          <>
            {tab === 1 && groupByDate(upcomingOnly).map(({ date, items }) => (
              <div key={date}>
                <p className="text-sm font-semibold text-text-primary py-3">
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
                    weekday: 'long', month: 'short', day: 'numeric'
                  })}
                </p>
                {items.map((a) => (
                  <ApptCard key={a.id} appt={a} router={router} tab={tab} onUpdate={updateStatus} />
                ))}
              </div>
            ))}
            {tab !== 1 && lists[tab].map((a) => (
              <ApptCard key={a.id} appt={a} router={router} tab={tab} onUpdate={updateStatus} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function groupByDate(appts: Appointment[]): { date: string; items: Appointment[] }[] {
  const map = new Map<string, Appointment[]>();
  appts.forEach((a) => {
    map.set(a.appointment_date, [...(map.get(a.appointment_date) || []), a]);
  });
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

function ApptCard({ appt, router, tab, onUpdate }: {
  appt: Appointment; router: any; tab: number; onUpdate: (id: string, status: string) => void;
}) {
  return (
    <div className="mb-3 bg-app-surface rounded-md border border-app-border shadow-card overflow-hidden">
      {/* Main row */}
      <button
        onClick={() => router.push(`/patients/${appt.patient_id}/`)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left press-effect"
      >
        <div className="w-14 text-center flex-shrink-0">
          <p className="text-sm font-semibold text-primary">{formatTime12(appt.appointment_time).split(' ')[0]}</p>
          <p className="text-[10px] font-medium text-primary">{formatTime12(appt.appointment_time).split(' ')[1]}</p>
        </div>
        <div className="w-px h-10 bg-app-border flex-shrink-0" />
        <div className="flex-1 min-w-0 ml-1">
          <p className="text-sm font-semibold text-text-primary truncate">{appt.patients?.name}</p>
          <p className="text-xs text-text-secondary truncate">{appt.purpose || 'Dental consultation'}</p>
        </div>
        <StatusBadge status={appt.status} />
      </button>

      {/* Action bar */}
      <div className="border-t border-app-divider flex divide-x divide-app-divider">
        {/* Edit always available */}
        <button
          onClick={() => router.push(
            `/appointments/schedule/?appointmentId=${appt.id}&patientId=${appt.patient_id}&patientName=${encodeURIComponent(appt.patients?.name || '')}`
          )}
          className="flex-1 py-2 text-xs font-semibold text-primary flex items-center justify-center gap-1"
        >
          <Edit2 className="w-3 h-3" /> Edit
        </button>

        {/* Today tab: Mark Complete + Mark Missed */}
        {tab === 0 && appt.status === 'scheduled' && (
          <>
            <button
              onClick={() => onUpdate(appt.id, 'completed')}
              className="flex-1 py-2 text-xs font-semibold text-success flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" /> Attended
            </button>
            <button
              onClick={() => onUpdate(appt.id, 'missed')}
              className="flex-1 py-2 text-xs font-semibold text-error flex items-center justify-center gap-1"
            >
              <XCircle className="w-3 h-3" /> Missed
            </button>
          </>
        )}

        {/* Missed tab: Reschedule */}
        {tab === 2 && (
          <button
            onClick={() => router.push(
              `/appointments/schedule/?patientId=${appt.patient_id}&patientName=${encodeURIComponent(appt.patients?.name || '')}`
            )}
            className="flex-1 py-2 text-xs font-semibold text-warning flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reschedule
          </button>
        )}
      </div>
    </div>
  );
}
