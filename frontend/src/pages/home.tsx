import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import {
  Calendar, Clock, CheckCircle, AlertTriangle, Search, CheckCircle2
} from 'lucide-react';
import { analyticsApi, appointmentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import StatusBadge from '@/components/shared/StatusBadge';
import PatientAvatar from '@/components/shared/PatientAvatar';
import EmptyState from '@/components/shared/EmptyState';
import { StatCardShimmer } from '@/components/shared/LoadingShimmer';
import { formatTime12, daysBetween, getInitials } from '@/lib/utils';
import type { DashboardStats, Appointment } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const { dentist } = useAuthStore();
  const qc = useQueryClient();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
  });

  const { data: todayData, isLoading: todayLoading, refetch: refetchToday } = useQuery<{ appointments: Appointment[] }>({
    queryKey: ['appointments', 'today'],
    queryFn: () => appointmentsApi.today().then((r) => r.data),
  });

  const markAttended = async (apptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await appointmentsApi.update(apptId, { status: 'completed' });
    refetchToday();
    refetchStats();
    qc.invalidateQueries({ queryKey: ['appointments'] });
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-bg">
      {/* Header — warm, white, no gradient */}
      <div className="bg-surface border-b border-divider px-5 pt-12 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-text-secondary">{todayStr}</p>
            <h1 className="text-xl font-semibold text-text-primary mt-0.5">
              {greeting}, Dr. {dentist?.name || 'Doctor'}
            </h1>
          </div>
          <button
            onClick={() => router.push('/settings/')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-accent-light text-accent text-sm font-semibold flex-shrink-0"
          >
            {getInitials(dentist?.name || 'Dr')}
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 pb-6">
        {/* Stats strip — horizontal scroll */}
        {statsLoading ? <StatCardShimmer /> : (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5">
            <StatCard icon={<Calendar className="w-[18px] h-[18px] text-accent" />}
              value={stats?.totalAppointmentsToday ?? 0} label="Today's" />
            <StatCard icon={<Clock className="w-[18px] h-[18px] text-amber" />}
              value={stats?.upcomingToday ?? 0} label="Upcoming" />
            <StatCard icon={<CheckCircle className="w-[18px] h-[18px] text-success" />}
              value={stats?.completedToday ?? 0} label="Done" />
            <StatCard icon={<AlertTriangle className="w-[18px] h-[18px] text-error" />}
              value={stats?.pendingFollowUps ?? 0} label="Follow-ups" />
          </div>
        )}

        {/* Search bar — navigation shortcut */}
        <button
          onClick={() => router.push('/patients/?focus=1')}
          className="w-full flex items-center gap-2.5 bg-surface-subtle rounded-full px-4 h-11 mt-4 text-left"
        >
          <Search className="w-[18px] h-[18px] text-text-disabled flex-shrink-0" />
          <span className="text-sm text-text-disabled">Search patients by name or phone...</span>
        </button>

        {/* Today's Patients */}
        <div className="flex items-center justify-between mt-6 mb-3">
          <h2 className="text-base font-semibold text-text-primary">Today&apos;s Patients</h2>
          <button onClick={() => router.push('/appointments/')} className="text-sm font-semibold text-accent">
            See All →
          </button>
        </div>

        {todayLoading ? (
          <div className="bg-surface rounded-xl border border-border p-4 text-center text-sm text-text-secondary">Loading…</div>
        ) : !todayData?.appointments?.length ? (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <EmptyState icon={Calendar} title="No patients today" subtitle="Schedule your first appointment" />
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayData.appointments.map((appt) => {
              const completed = appt.status === 'completed';
              return (
                <button
                  key={appt.id}
                  onClick={() => router.push(`/patients/${appt.patient_id}/`)}
                  className={`w-full flex items-center gap-3 bg-surface rounded-xl border border-border shadow-sm px-4 py-3.5 text-left press-effect border-l-4 ${
                    completed ? 'border-l-success' : 'border-l-accent'
                  }`}
                >
                  <div className="w-14 flex-shrink-0">
                    <p className="text-sm font-semibold text-accent leading-none">
                      {formatTime12(appt.appointment_time).split(' ')[0]}
                    </p>
                    <p className="text-[10px] font-medium text-accent mt-0.5">
                      {formatTime12(appt.appointment_time).split(' ')[1]}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{appt.patients?.name}</p>
                    <p className="text-xs text-text-secondary truncate">{appt.purpose || 'Dental consultation'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={appt.status} />
                    {appt.status === 'scheduled' && (
                      <span
                        onClick={(e) => markAttended(appt.id, e)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-success-light border border-success-border press-effect"
                        title="Mark as attended"
                      >
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
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

        {/* Recent Appointments */}
        {(stats?.recentAppointments?.length ?? 0) > 0 && (
          <>
            <div className="flex items-center justify-between mt-6 mb-3">
              <h2 className="text-base font-semibold text-text-primary">Recent Appointments</h2>
              <button onClick={() => router.push('/appointments/')} className="text-sm font-semibold text-accent">
                See All →
              </button>
            </div>
            <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
              {stats!.recentAppointments!.map((appt, i) => {
                const patientName = appt.patients?.name || 'Patient';
                return (
                  <div key={appt.id}>
                    {i > 0 && <div className="h-px bg-divider mx-4" />}
                    <button
                      onClick={() => router.push(`/patients/${appt.patient_id}/`)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left press-effect"
                    >
                      <PatientAvatar name={patientName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{patientName}</p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <p className="text-xs text-text-secondary">
                            {new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short'
                            })}
                            {appt.appointment_time && ` · ${formatTime12(appt.appointment_time)}`}
                          </p>
                          {appt.tooth_number && (
                            <span className="text-[10px] font-semibold bg-accent-light text-accent px-1.5 py-0.5 rounded-full">
                              Tooth {appt.tooth_number}
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={appt.status} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }: {
  icon: React.ReactNode; value: number; label: string;
}) {
  return (
    <div className="flex-shrink-0 w-[150px] h-[72px] bg-surface border border-border rounded-xl shadow-sm px-4 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-2xl font-bold text-text-primary leading-none">{value}</p>
        <p className="text-xs text-text-secondary mt-1">{label}</p>
      </div>
    </div>
  );
}
