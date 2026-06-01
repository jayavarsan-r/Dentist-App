import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import {
  ArrowLeft, Edit2, Mic, Calendar, Phone, AlertTriangle,
  FileText, Pill, ChevronRight, CheckCircle2, Clock, Activity,
  IndianRupee, Map
} from 'lucide-react';
import { patientsApi, appointmentsApi } from '@/lib/api';
import PatientAvatar from '@/components/shared/PatientAvatar';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { ProfileShimmer } from '@/components/shared/LoadingShimmer';
import ToothChart from '@/components/shared/ToothChart';
import ToothDetailSheet from '@/components/shared/ToothDetailSheet';
import { formatDate, formatTime12 } from '@/lib/utils';
import type { Patient, Visit, Appointment, ToothHistoryResponse, ToothData } from '@/types';

const TABS = ['Overview', 'Tooth Map', 'Billing'] as const;
type Tab = typeof TABS[number];

export default function PatientProfilePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = router.query as { id: string };
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [selectedTooth, setSelectedTooth] = useState<ToothData | null>(null);

  const { data, isLoading, refetch } = useQuery<{ patient: Patient }>({
    queryKey: ['patient', id],
    queryFn: () => patientsApi.getById(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: toothHistoryData, isLoading: toothLoading } = useQuery<ToothHistoryResponse>({
    queryKey: ['toothHistory', id],
    queryFn: () => patientsApi.toothHistory(id).then((r) => r.data),
    enabled: !!id && activeTab === 'Tooth Map',
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

  const handleToothClick = (toothNum: string) => {
    if (!toothHistoryData) return;
    const td = toothHistoryData.toothMap.find((t) => t.toothNumber === toothNum);
    if (td) setSelectedTooth(td);
  };

  if (isLoading) return <ProfileShimmer />;
  if (!patient) return null;

  // Billing stats
  const totalBilled = visits.reduce((sum, v) => sum + (v.cost ? parseFloat(String(v.cost)) : 0), 0);
  const visitsWithCost = visits.filter((v) => v.cost != null && v.cost > 0);

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Hero Header */}
      <div style={{ background: 'linear-gradient(135deg, #1B70F8, #1355C4)' }} className="px-5 pt-12 pb-0">
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

        <div className="flex items-center gap-4 mb-4">
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
          <div className="mb-4 space-y-2">
            {patient.allergies && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-400/40 rounded-md px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-red-300 flex-shrink-0" />
                <span className="text-xs text-white">Allergic to: {patient.allergies}</span>
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

        {/* Tabs */}
        <div className="flex border-b border-white/20">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="px-5 py-4 pb-10">
          {/* Action chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
            <ActionChip icon={<Mic className="w-5 h-5" />} label="Record Visit" highlight
              onClick={() => router.push(`/voice/record/?patientId=${id}&patientName=${encodeURIComponent(patient.name)}`)} />
            <ActionChip icon={<Calendar className="w-5 h-5" />} label="Schedule"
              onClick={() => router.push(`/appointments/schedule/?patientId=${id}&patientName=${encodeURIComponent(patient.name)}`)} />
            <ActionChip icon={<Map className="w-5 h-5" />} label="Tooth Map"
              onClick={() => setActiveTab('Tooth Map')} />
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
      )}

      {activeTab === 'Tooth Map' && (
        <div className="px-5 py-5 pb-10">
          {toothLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats bar */}
              {toothHistoryData && (
                <div className="flex gap-3 mb-5">
                  <StatPill value={toothHistoryData.toothMap.filter(t => t.overallStatus === 'treated' || t.overallStatus === 'treated_pending').length} label="Treated" color="text-blue-700 bg-blue-100" />
                  <StatPill value={toothHistoryData.toothMap.filter(t => t.overallStatus === 'pending' || t.overallStatus === 'treated_pending').length} label="Scheduled" color="text-amber-700 bg-amber-100" />
                  <StatPill value={toothHistoryData.totalBilled} label="Billed" color="text-success bg-success-light" isCurrency />
                </div>
              )}

              <div className="bg-app-surface rounded-xl border border-app-border shadow-card p-4 mb-4">
                <p className="text-xs font-semibold text-text-secondary mb-3 text-center">Tap a tooth to see details</p>
                <ToothChart
                  toothData={toothHistoryData?.toothMap ?? []}
                  onToothClick={handleToothClick}
                  highlightedTooth={selectedTooth?.toothNumber}
                />
              </div>

              {/* Treated teeth list */}
              {toothHistoryData && toothHistoryData.toothMap.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-text-secondary tracking-widest uppercase mb-3">
                    Treated Teeth
                  </p>
                  <div className="space-y-2">
                    {toothHistoryData.toothMap.map((tooth) => (
                      <button
                        key={tooth.toothNumber}
                        onClick={() => setSelectedTooth(tooth)}
                        className="w-full bg-app-surface rounded-lg border border-app-border shadow-card px-4 py-3 flex items-center gap-3 text-left press-effect"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary-surface flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{tooth.toothNumber}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary">Tooth {tooth.toothNumber}</p>
                          <p className="text-xs text-text-secondary">
                            {tooth.completedProcedures.length} procedure{tooth.completedProcedures.length !== 1 ? 's' : ''}
                            {tooth.completedProcedures[0] && ` • ${tooth.completedProcedures[0].procedure}`}
                          </p>
                        </div>
                        {tooth.totalCost > 0 && (
                          <span className="text-xs font-semibold text-success flex-shrink-0">
                            ₹{tooth.totalCost.toLocaleString('en-IN')}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-text-disabled flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {(!toothHistoryData || toothHistoryData.toothMap.length === 0) && (
                <EmptyState
                  icon={Map}
                  title="No tooth records"
                  subtitle="Record visits with tooth numbers to populate the chart"
                />
              )}
            </>
          )}

          <ToothDetailSheet tooth={selectedTooth} onClose={() => setSelectedTooth(null)} />
        </div>
      )}

      {activeTab === 'Billing' && (
        <div className="px-5 py-5 pb-10">
          {/* Summary card */}
          <div className="bg-app-surface rounded-xl border border-app-border shadow-elevated p-5 mb-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-success-light flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-text-secondary">Total Billed</p>
                <p className="text-2xl font-bold text-success">₹{totalBilled.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-app-surface-variant rounded-lg p-3">
                <p className="text-lg font-bold text-text-primary">{visits.length}</p>
                <p className="text-xs text-text-secondary">Total Visits</p>
              </div>
              <div className="bg-app-surface-variant rounded-lg p-3">
                <p className="text-lg font-bold text-text-primary">{visitsWithCost.length}</p>
                <p className="text-xs text-text-secondary">With Cost</p>
              </div>
            </div>
          </div>

          {/* Visit billing list */}
          <p className="text-[11px] font-semibold text-text-secondary tracking-widest uppercase mb-3">Visit History</p>
          {visits.length === 0 ? (
            <EmptyState icon={IndianRupee} title="No billing records" subtitle="Records will appear after visits are saved" />
          ) : (
            <div className="space-y-2">
              {visits.map((visit) => (
                <div key={visit.id} className="bg-app-surface rounded-lg border border-app-border shadow-card px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{visit.procedure_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-text-secondary">
                        {new Date(visit.visit_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {visit.tooth_number && (
                        <span className="text-[10px] bg-primary-surface text-primary px-1.5 py-0.5 rounded">
                          T{visit.tooth_number}
                        </span>
                      )}
                    </div>
                  </div>
                  {visit.cost != null && visit.cost > 0 ? (
                    <span className="text-sm font-bold text-success flex-shrink-0">
                      ₹{parseFloat(String(visit.cost)).toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-xs text-text-disabled flex-shrink-0">—</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatPill({ value, label, color, isCurrency }: {
  value: number; label: string; color: string; isCurrency?: boolean;
}) {
  return (
    <div className={`flex-1 rounded-lg px-3 py-2 ${color}`}>
      <p className="text-sm font-bold">
        {isCurrency ? `₹${value.toLocaleString('en-IN')}` : value}
      </p>
      <p className="text-[10px] opacity-80">{label}</p>
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
          {appt.tooth_number && (
            <span className="inline-block mt-1 text-[10px] bg-primary-surface text-primary px-1.5 py-0.5 rounded font-medium">
              Tooth {appt.tooth_number}
            </span>
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
              <span className="ml-1.5 text-xs font-normal text-primary bg-primary-surface px-1.5 py-0.5 rounded">
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
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={visit.status} />
          {visit.cost != null && visit.cost > 0 && (
            <span className="text-xs font-bold text-success">₹{parseFloat(String(visit.cost)).toLocaleString('en-IN')}</span>
          )}
        </div>
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
