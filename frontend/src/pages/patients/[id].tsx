import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import {
  ArrowLeft, Edit2, Mic, Calendar, Phone, AlertTriangle,
  FileText, Pill, ChevronRight, CheckCircle2, Clock, Activity
} from 'lucide-react';
import { patientsApi, appointmentsApi } from '@/lib/api';
import PatientAvatar from '@/components/shared/PatientAvatar';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { ProfileShimmer } from '@/components/shared/LoadingShimmer';
import { formatDate, formatShortDate, formatTime12 } from '@/lib/utils';
import type { Patient, Visit, Appointment } from '@/types';

export default function PatientProfilePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = router.query as { id: string };

  const { data, isLoading, refetch } = useQuery<{ patient: Patient }>({
    queryKey: ['patient', id],
    queryFn: () => patientsApi.getById(id).then((r) => r.data),
    enabled: !!id,
  });

  const patient = data?.patient;
  const visits = (patient?.visits ?? []).sort((a, b) => b.visit_date.localeCompare(a.visit_date));
  const appointments = (patient?.appointments ?? []).sort((a, b) =>
    b.appointment_date.localeCompare(a.appointment_date)
  );

  const markAppointmentDone = async (apptId: string) => {
    await appointmentsApi.update(apptId, { status: 'completed' });
    qc.invalidateQueries({ queryKey: ['patient', id] });
    qc.invalidateQueries({ queryKey: ['appointments'] });
    refetch();
  };

  if (isLoading) return <ProfileShimmer />;
  if (!patient) return null;

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Hero Header */}
      <div style={{ background: 'linear-gradient(135deg, #1B70F8, #1355C4)' }} className="px-5 pt-12 pb-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => router.push(`/patients/${id}/edit/`)}
            className="p-2 text-white/80"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <PatientAvatar name={patient.name} size="lg" light />
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-bold text-white">{patient.name}</h1>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {patient.age && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-xs text-white">{patient.age} yrs</span>
              )}
              {patient.gender && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-xs text-white capitalize">{patient.gender}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Phone className="w-3.5 h-3.5 text-white/70" />
              <span className="text-xs text-white/80">{patient.phone}</span>
            </div>
          </div>
        </div>

        {/* Medical info strip */}
        {(patient.allergies || patient.medical_conditions) && (
          <div className="mt-4 space-y-2">
            {patient.allergies && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-400/40 rounded-md px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-red-300 flex-shrink-0" />
                <span className="text-xs text-white">⚠ Allergic to: {patient.allergies}</span>
              </div>
            )}
            {patient.medical_conditions && (
              <div className="flex items-center gap-2 bg-white/10 rounded-md px-3 py-2">
                <Activity className="w-4 h-4 text-white/70 flex-shrink-0" />
                <span className="text-xs text-white/80">{patient.medical_conditions}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-4 pb-10">
        {/* Action chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
          <ActionChip icon={<Mic className="w-5 h-5" />} label="Record Visit" highlight
            onClick={() => router.push(`/voice/record/?patientId=${id}&patientName=${encodeURIComponent(patient.name)}`)} />
          <ActionChip icon={<Calendar className="w-5 h-5" />} label="Schedule"
            onClick={() => router.push(`/appointments/schedule/?patientId=${id}&patientName=${encodeURIComponent(patient.name)}`)} />
          <ActionChip icon={<Phone className="w-5 h-5" />} label="Call"
            onClick={() => { if (typeof window !== 'undefined') window.open(`tel:${patient.phone}`); }} />
        </div>

        {/* Upcoming Appointments */}
        {appointments.length > 0 && (
          <>
            <SectionHeader label="Appointments" count={appointments.length} />
            <div className="space-y-2 mb-6">
              {appointments.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  patientId={id}
                  patientName={patient.name}
                  onMarkDone={() => markAppointmentDone(appt.id)}
                  onEdit={() => router.push(
                    `/appointments/schedule/?appointmentId=${appt.id}&patientId=${id}&patientName=${encodeURIComponent(patient.name)}`
                  )}
                />
              ))}
            </div>
          </>
        )}

        {/* Treatment History */}
        <SectionHeader label="Treatment History" count={visits.length} />

        {visits.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No visit records yet"
            subtitle="Tap Record Visit to add the first treatment note"
            ctaLabel="Record First Visit"
            onCta={() => router.push(`/voice/record/?patientId=${id}&patientName=${encodeURIComponent(patient.name)}`)}
          />
        ) : (
          <div className="space-y-3">
            {visits.map((visit) => (
              <VisitCard key={visit.id} visit={visit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-[11px] font-semibold text-text-secondary tracking-widest uppercase">{label}</p>
      <span className="text-xs text-text-disabled">{count} {count === 1 ? 'record' : 'records'}</span>
    </div>
  );
}

function ActionChip({ icon, label, highlight, onClick }: {
  icon: React.ReactNode; label: string; highlight?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-md border shadow-card press-effect ${
        highlight ? 'bg-primary-surface border-[1.5px] border-primary' : 'bg-app-surface border-app-border'
      }`}
    >
      <span className="text-primary">{icon}</span>
      <span className="text-sm font-medium text-primary whitespace-nowrap">{label}</span>
    </button>
  );
}

function AppointmentCard({ appt, patientId, patientName, onMarkDone, onEdit }: {
  appt: Appointment; patientId: string; patientName: string;
  onMarkDone: () => void; onEdit: () => void;
}) {
  const isPast = appt.appointment_date < new Date().toISOString().split('T')[0];
  const isToday = appt.appointment_date === new Date().toISOString().split('T')[0];

  return (
    <div className="bg-app-surface rounded-md border border-app-border shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Date block */}
        <div className={`w-12 h-14 rounded-md flex flex-col items-center justify-center flex-shrink-0 ${
          isToday ? 'bg-primary' : isPast ? 'bg-app-surface-variant' : 'bg-primary-surface'
        }`}>
          <span className={`text-[10px] font-medium uppercase ${isToday ? 'text-white/80' : 'text-primary'}`}>
            {new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('en', { month: 'short' })}
          </span>
          <span className={`text-lg font-bold leading-none ${isToday ? 'text-white' : 'text-primary'}`}>
            {new Date(appt.appointment_date + 'T00:00:00').getDate()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
            <span className="text-sm font-semibold text-text-primary">{formatTime12(appt.appointment_time)}</span>
            {isToday && <span className="text-[10px] font-semibold text-primary bg-primary-surface px-1.5 py-0.5 rounded-full">TODAY</span>}
          </div>
          {appt.purpose && (
            <p className="text-xs text-text-secondary mt-0.5 truncate">{appt.purpose}</p>
          )}
          <StatusBadge status={appt.status} className="mt-1.5" />
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-app-divider flex divide-x divide-app-divider">
        <button onClick={onEdit} className="flex-1 py-2 text-xs font-semibold text-primary flex items-center justify-center gap-1.5">
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </button>
        {appt.status === 'scheduled' && (
          <button onClick={onMarkDone} className="flex-1 py-2 text-xs font-semibold text-success flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark Attended
          </button>
        )}
      </div>
    </div>
  );
}

function VisitCard({ visit }: { visit: Visit }) {
  const statusColors: Record<string, string> = {
    completed: 'border-l-success',
    in_progress: 'border-l-info',
    pending: 'border-l-warning',
    cancelled: 'border-l-app-border',
  };

  return (
    <div className={`bg-app-surface rounded-md border border-app-border shadow-card border-l-4 ${statusColors[visit.status] || 'border-l-app-border'} overflow-hidden`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text-primary">
            {visit.procedure_name}
            {visit.tooth_number && (
              <span className="ml-1.5 text-xs font-normal text-text-secondary bg-primary-surface text-primary px-1.5 py-0.5 rounded">
                Tooth {visit.tooth_number}
              </span>
            )}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            {new Date(visit.visit_date + 'T00:00:00').toLocaleDateString('en-IN', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            })}
          </p>
        </div>
        <StatusBadge status={visit.status} />
      </div>

      {/* Details */}
      <div className="px-4 pb-3.5 space-y-2.5">
        {visit.notes && (
          <DetailRow icon={<FileText className="w-3.5 h-3.5" />} label="Clinical Notes" value={visit.notes} />
        )}
        {visit.medications && (
          <DetailRow icon={<Pill className="w-3.5 h-3.5" />} label="Medications" value={visit.medications} />
        )}
        {visit.next_steps && (
          <DetailRow icon={<ChevronRight className="w-3.5 h-3.5" />} label="Next Steps" value={visit.next_steps} />
        )}
        {visit.follow_up_date && !visit.follow_up_done && (
          <div className="flex items-center gap-2 bg-warning-light border border-warning-border rounded-md px-3 py-2 mt-1">
            <Calendar className="w-3.5 h-3.5 text-warning flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-warning">Follow-up: </span>
              <span className="text-xs text-warning">{formatDate(visit.follow_up_date)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-text-disabled">{icon}</span>
        <span className="text-[10px] font-semibold text-text-disabled uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm text-text-primary leading-relaxed pl-5">{value}</p>
    </div>
  );
}
