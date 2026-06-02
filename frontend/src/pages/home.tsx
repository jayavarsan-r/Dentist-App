import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import {
  Search, Users, Clock, CheckCircle, AlertTriangle, ChevronRight,
  Mic, Stethoscope, X, FileText, Scan, Grid2X2, Pill, ArrowRight
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
  const [consultMode, setConsultMode] = useState(false);

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
  const done = queue.filter((q) => q.status === 'completed' || q.status === 'checked_out');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const displayName = staff?.name || dentist?.name || 'Doctor';

  const currentPatient = inConsult[0] ?? null;
  const nextPatient = waiting[0] ?? null;

  if (consultMode) {
    return (
      <ConsultationModeView
        currentPatient={currentPatient}
        nextPatient={nextPatient}
        waiting={waiting}
        done={done}
        onExit={() => setConsultMode(false)}
        onNavigate={(path) => router.push(path)}
      />
    );
  }

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
          <div className="flex items-center gap-2">
            {/* Consultation Mode toggle */}
            <button
              onClick={() => setConsultMode(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold text-white flex-shrink-0 press-effect"
              style={{ background: '#1C1C1E' }}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Consult</span>
            </button>
            <button
              onClick={() => router.push('/settings/')}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-accent-light text-accent text-sm font-semibold flex-shrink-0"
            >
              {getInitials(displayName)}
            </button>
          </div>
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

// ─── CONSULTATION MODE VIEW ────────────────────────────────────────────────

function ConsultationModeView({
  currentPatient,
  nextPatient,
  waiting,
  done,
  onExit,
  onNavigate,
}: {
  currentPatient: QueueEntry | null;
  nextPatient: QueueEntry | null;
  waiting: QueueEntry[];
  done: QueueEntry[];
  onExit: () => void;
  onNavigate: (path: string) => void;
}) {
  const patientName = currentPatient?.patients?.name || 'No patient in consultation';
  const nextName = nextPatient?.patients?.name || null;

  return (
    <div className="min-h-screen pb-6" style={{ background: '#0A0E1A' }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Consultation Mode
          </span>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 h-8 px-3 rounded-full press-effect"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
        >
          <X className="w-3.5 h-3.5" />
          <span style={{ fontSize: 12, fontWeight: 600 }}>Exit</span>
        </button>
      </div>

      <div className="px-5 space-y-4">
        {/* ── CURRENT PATIENT ── */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Current Patient
          </p>
          {currentPatient ? (
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
                    {getInitials(patientName)}
                  </div>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{patientName}</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                      {[currentPatient.patients?.age && `${currentPatient.patients.age} yrs`, currentPatient.patients?.gender].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>#{currentPatient.token_number}</span>
                </div>
              </div>

              {/* Chief Complaint */}
              {currentPatient.chief_complaint && (
                <div className="mb-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Chief Complaint</p>
                  <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic' }}>
                    "{currentPatient.chief_complaint}"
                  </p>
                </div>
              )}

              {/* Treatment Progress */}
              {currentPatient.treatment_plans && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#4DA3FF' }}>
                      {currentPatient.treatment_plans.procedure_name}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                      Sitting {(currentPatient.treatment_plans.completed_sittings || 0) + 1}/{currentPatient.treatment_plans.total_sittings}
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div className="h-full rounded-full" style={{
                      background: '#4DA3FF',
                      width: `${((currentPatient.treatment_plans.completed_sittings || 0) / currentPatient.treatment_plans.total_sittings) * 100}%`
                    }} />
                  </div>
                </div>
              )}

              {/* Outstanding Balance */}
              {currentPatient.treatment_plans?.pending_amount && Number(currentPatient.treatment_plans.pending_amount) > 0 && (
                <div className="flex items-center justify-between rounded-xl px-4 py-2.5"
                  style={{ background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)' }}>
                  <span style={{ fontSize: 13, color: '#FF6B6B' }}>Outstanding Balance</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#FF6B6B' }}>
                    ₹{Number(currentPatient.treatment_plans.pending_amount).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl p-6 flex flex-col items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Stethoscope className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)' }}>No active consultation</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>Start a patient from the queue to begin</p>
            </div>
          )}
        </div>

        {/* ── DOCTOR ACTIONS ── */}
        {currentPatient && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Doctor Actions
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <ActionButton
                icon={<Mic className="w-4 h-4" />}
                label="Record Diagnosis"
                onClick={() => onNavigate(`/voice/record/?patientId=${currentPatient.patient_id}&patientName=${encodeURIComponent(patientName)}`)}
                primary
              />
              <ActionButton
                icon={<FileText className="w-4 h-4" />}
                label="View Full History"
                onClick={() => onNavigate(`/patients/${currentPatient.patient_id}/`)}
              />
              <ActionButton
                icon={<Scan className="w-4 h-4" />}
                label="View X-Rays"
                onClick={() => onNavigate(`/xrays/${currentPatient.patient_id}/`)}
              />
              <ActionButton
                icon={<Grid2X2 className="w-4 h-4" />}
                label="Tooth Chart"
                onClick={() => onNavigate(`/patients/tooth-map/?patientId=${currentPatient.patient_id}`)}
              />
              <ActionButton
                icon={<Pill className="w-4 h-4" />}
                label="Generate Rx"
                onClick={() => onNavigate(`/prescription/new/?patientId=${currentPatient.patient_id}`)}
              />
              <ActionButton
                icon={<CheckCircle className="w-4 h-4" />}
                label="Mark Complete"
                onClick={() => onNavigate(`/consult/${currentPatient.id}/`)}
                accent
              />
            </div>
          </div>
        )}

        {/* ── NEXT PATIENT ── */}
        {nextPatient && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              Next Patient
            </p>
            <button
              onClick={() => onNavigate(`/consult/${nextPatient.id}/`)}
              className="w-full rounded-2xl p-4 flex items-center gap-3 text-left press-effect"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: nextPatient.priority === 'urgent' ? 'rgba(255,59,48,0.2)' : 'rgba(255,255,255,0.1)', color: nextPatient.priority === 'urgent' ? '#FF6B6B' : 'rgba(255,255,255,0.6)' }}>
                #{nextPatient.token_number}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{nextName}</p>
                {nextPatient.chief_complaint && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nextPatient.chief_complaint}
                  </p>
                )}
              </div>
              <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
            </button>
          </div>
        )}

        {/* ── QUEUE SUMMARY ── */}
        <div className="rounded-xl px-4 py-3 flex items-center gap-4"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="text-center">
            <p style={{ fontSize: 22, fontWeight: 700, color: '#FFC107' }}>{waiting.length}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Waiting</p>
          </div>
          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />
          <div className="text-center">
            <p style={{ fontSize: 22, fontWeight: 700, color: '#4DA3FF' }}>{1}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>In Consult</p>
          </div>
          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />
          <div className="text-center">
            <p style={{ fontSize: 22, fontWeight: 700, color: '#4CAF50' }}>{done.length}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Done</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, primary, accent }: {
  icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean; accent?: boolean;
}) {
  const bg = primary ? 'rgba(27,112,248,0.2)' : accent ? 'rgba(52,199,89,0.2)' : 'rgba(255,255,255,0.07)';
  const color = primary ? '#4DA3FF' : accent ? '#4CAF50' : 'rgba(255,255,255,0.75)';
  const border = primary ? '1px solid rgba(27,112,248,0.3)' : accent ? '1px solid rgba(52,199,89,0.3)' : '1px solid rgba(255,255,255,0.08)';

  return (
    <button onClick={onClick} className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-left press-effect w-full"
      style={{ background: bg, border, color }}>
      {icon}
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

// ─── NORMAL MODE COMPONENTS ────────────────────────────────────────────────

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
