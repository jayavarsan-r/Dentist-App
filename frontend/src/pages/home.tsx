import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import {
  Bell, Calendar, Clock, CheckCircle, AlertTriangle, Plus, Search, Mic, CheckCircle2
} from 'lucide-react';
import { analyticsApi, appointmentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import StatusBadge from '@/components/shared/StatusBadge';
import PatientAvatar from '@/components/shared/PatientAvatar';
import EmptyState from '@/components/shared/EmptyState';
import { StatCardShimmer } from '@/components/shared/LoadingShimmer';
import { formatTime12, daysBetween } from '@/lib/utils';
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
  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1B70F8, #1355C4)' }} className="px-5 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/80">{greeting},</p>
            <h1 className="text-[22px] font-bold text-white">Dr. {dentist?.name || 'Doctor'}</h1>
          </div>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15">
            <Bell className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="px-5 -mt-1 pb-6">
        {/* Overview */}
        <div className="flex items-center justify-between mb-3 mt-5">
          <h2 className="text-base font-semibold text-text-primary">Today&apos;s Overview</h2>
          <span className="text-xs text-text-secondary">{todayStr}</span>
        </div>

        {statsLoading ? <StatCardShimmer /> : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Calendar className="w-5 h-5 text-primary" />} value={stats?.totalAppointmentsToday ?? 0}
              label="Appointments" bg="bg-primary-surface" border="border-[#BED9FF]" valueColor="text-primary" />
            <StatCard icon={<Clock className="w-5 h-5 text-warning" />} value={stats?.upcomingToday ?? 0}
              label="Upcoming" bg="bg-warning-light" border="border-warning-border" valueColor="text-warning" />
            <StatCard icon={<CheckCircle className="w-5 h-5 text-success" />} value={stats?.completedToday ?? 0}
              label="Completed" bg="bg-success-light" border="border-success-border" valueColor="text-success" />
            <StatCard icon={<AlertTriangle className="w-5 h-5 text-error" />} value={stats?.pendingFollowUps ?? 0}
              label="Follow-ups" bg="bg-error-light" border="border-error-border" valueColor="text-error" />
          </div>
        )}

        {/* Quick Actions */}
        <h2 className="text-base font-semibold text-text-primary mt-6 mb-3">Quick Actions</h2>
        <div className="flex gap-3">
          <QuickAction icon={<Plus className="w-7 h-7 text-primary" />} label="Add Patient" onClick={() => router.push('/patients/add/')} />
          <QuickAction icon={<Search className="w-7 h-7 text-primary" />} label="Search" onClick={() => router.push('/patients/')} />
          <QuickAction icon={<Mic className="w-7 h-7 text-primary" />} label="Record Note" onClick={() => router.push('/patients/')} />
        </div>

        {/* Today's Patients */}
        <div className="flex items-center justify-between mt-6 mb-3">
          <h2 className="text-base font-semibold text-text-primary">Today&apos;s Patients</h2>
          <button onClick={() => router.push('/appointments/')} className="text-sm font-semibold text-primary">
            See All →
          </button>
        </div>

        <div className="bg-app-surface rounded-md border border-app-border shadow-card overflow-hidden">
          {todayLoading ? (
            <div className="p-4 text-center text-sm text-text-secondary">Loading…</div>
          ) : !todayData?.appointments?.length ? (
            <EmptyState icon={Calendar} title="No patients today" subtitle="Schedule your first appointment" />
          ) : (
            todayData.appointments.map((appt, i) => (
              <div key={appt.id}>
                {i > 0 && <div className="h-px bg-app-divider mx-4" />}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  {/* Time */}
                  <button
                    onClick={() => router.push(`/patients/${appt.patient_id}/`)}
                    className="w-14 text-center flex-shrink-0"
                  >
                    <p className="text-sm font-semibold text-primary leading-none">
                      {formatTime12(appt.appointment_time).split(' ')[0]}
                    </p>
                    <p className="text-[10px] font-medium text-primary">
                      {formatTime12(appt.appointment_time).split(' ')[1]}
                    </p>
                  </button>
                  <div className="w-px h-10 bg-app-border flex-shrink-0" />

                  {/* Info */}
                  <button
                    onClick={() => router.push(`/patients/${appt.patient_id}/`)}
                    className="flex-1 min-w-0 text-left ml-1"
                  >
                    <p className="text-sm font-semibold text-text-primary truncate">{appt.patients?.name}</p>
                    <p className="text-xs text-text-secondary truncate">{appt.purpose || 'Dental consultation'}</p>
                  </button>

                  {/* Status + action */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={appt.status} />
                    {appt.status === 'scheduled' && (
                      <button
                        onClick={(e) => markAttended(appt.id, e)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-success-light border border-success-border press-effect"
                        title="Mark as attended"
                      >
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Follow-up Alerts */}
        {(stats?.followups?.length ?? 0) > 0 && (
          <>
            <div className="flex items-center justify-between mt-6 mb-3">
              <h2 className="text-base font-semibold text-text-primary">Follow-up Alerts</h2>
              <button
                onClick={() => router.push('/followups/')}
                className="text-xs font-semibold text-error"
              >
                {stats!.pendingFollowUps} pending →
              </button>
            </div>
            {stats!.followups.slice(0, 3).map((fu: any) => {
              const overdueDays = Math.abs(daysBetween(fu.follow_up_date));
              const patientName = fu.patients?.name || fu.patient_name || 'Patient';
              return (
                <button
                  key={fu.id}
                  onClick={() => router.push(`/patients/${fu.patient_id}/`)}
                  className="w-full flex items-center gap-3 bg-error-light rounded-md px-4 py-3 mb-2 border-l-4 border-error text-left press-effect"
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
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push('/patients/add/')}
        className="fixed bottom-20 right-5 flex items-center gap-2 bg-primary text-white px-5 py-3.5 rounded-2xl shadow-primary press-effect"
      >
        <Plus className="w-5 h-5" />
        <span className="text-sm font-semibold">Add Patient</span>
      </button>
    </div>
  );
}

function StatCard({ icon, value, label, bg, border, valueColor }: {
  icon: React.ReactNode; value: number; label: string;
  bg: string; border: string; valueColor: string;
}) {
  return (
    <div className={`${bg} border ${border} rounded-lg p-4 flex items-center justify-between`}>
      <div>
        <p className={`text-[22px] font-bold ${valueColor} leading-none`}>{value}</p>
        <p className="text-xs text-text-secondary mt-1">{label}</p>
      </div>
      {icon}
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1.5 bg-app-surface border border-app-border rounded-md py-3 shadow-card press-effect"
    >
      {icon}
      <span className="text-[11px] font-semibold text-primary">{label}</span>
    </button>
  );
}
