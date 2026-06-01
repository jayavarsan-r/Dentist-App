import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import {
  ArrowLeft, Mic, Calendar, Phone, AlertTriangle,
  FileText, Pill, ChevronRight, CheckCircle2, Clock, Sparkles,
  Map, Edit2, Activity, Heart, Droplet, Baby, Syringe, Check, X
} from 'lucide-react';
import { patientsApi, appointmentsApi } from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { ProfileShimmer } from '@/components/shared/LoadingShimmer';
import ToothChart from '@/components/shared/ToothChart';
import ToothDetailSheet from '@/components/shared/ToothDetailSheet';
import { formatDate, formatTime12 } from '@/lib/utils';
import type { Patient, Visit, Appointment, ToothHistoryResponse, ToothData, ClinicalFlags } from '@/types';

const TABS = ['Overview', 'History', 'Complications', 'Teeth'] as const;
type Tab = typeof TABS[number];

const todayStr = () => new Date().toISOString().split('T')[0];

function getPatientStatus(patient: Patient): 'new' | 'current' | 'old' {
  const today = todayStr();
  const completedVisits = patient.visits?.filter((v) => v.status === 'completed') ?? [];
  const upcomingAppts = patient.appointments?.filter(
    (a) => a.status === 'scheduled' && a.appointment_date >= today
  ) ?? [];
  if (completedVisits.length === 0) return 'new';
  if (upcomingAppts.length > 0) return 'current';
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const lastAppt = [...(patient.appointments ?? [])].sort((a, b) =>
    b.appointment_date.localeCompare(a.appointment_date)
  )[0];
  if (lastAppt && new Date(lastAppt.appointment_date) < sixMonthsAgo) return 'old';
  return 'current';
}

const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  new: { cls: 'bg-info-light text-info', label: 'New' },
  current: { cls: 'bg-accent-light text-accent', label: 'Current' },
  old: { cls: 'bg-surface-muted text-text-secondary', label: 'Old' },
};

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
    enabled: !!id && activeTab === 'Teeth',
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

  const status = getPatientStatus(patient);
  const pill = STATUS_PILL[status];

  // ── AI Summary data (all from existing patient query) ──
  const lastVisit = visits[0];
  const today = todayStr();
  const nextAppt = [...(patient.appointments ?? [])]
    .filter((a) => a.status === 'scheduled' && a.appointment_date >= today)
    .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))[0];
  const totalBilled = visits.reduce((sum, v) => sum + (v.cost ? parseFloat(String(v.cost)) : 0), 0);

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'scheduled' && a.appointment_date >= today
  );

  return (
    <div className="min-h-screen bg-bg pb-10">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (typeof window !== 'undefined') window.open(`tel:${patient.phone}`); }}
              className="p-1 text-accent"
            >
              <Phone className="w-5 h-5" />
            </button>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${pill.cls}`}>{pill.label}</span>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-text-primary">{patient.name}</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {[patient.gender && patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1),
            patient.age != null && `${patient.age} yrs`, patient.phone]
            .filter(Boolean).join(' · ')}
        </p>

        {patient.allergies && (
          <div className="mt-3 -mx-5 bg-error-light border-l-4 border-l-error px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-error flex-shrink-0" />
            <span className="text-xs text-error">Allergic to: {patient.allergies}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex mt-3 -mb-3">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'Overview' && (
        <div className="px-5 py-4 space-y-6">
          <AiSummaryCard
            lastVisit={lastVisit}
            nextAppt={nextAppt}
            totalBilled={totalBilled}
            hasVisits={visits.length > 0}
          />

          {/* Action chips */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <ActionChip icon={<Mic className="w-5 h-5" />} label="Record Visit" highlight
              onClick={() => router.push(`/voice/record/?patientId=${id}&patientName=${encodeURIComponent(patient.name)}`)} />
            <ActionChip icon={<Calendar className="w-5 h-5" />} label="Schedule"
              onClick={() => router.push(`/appointments/schedule/?patientId=${id}&patientName=${encodeURIComponent(patient.name)}`)} />
            <ActionChip icon={<Map className="w-5 h-5" />} label="Teeth"
              onClick={() => setActiveTab('Teeth')} />
          </div>

          {/* Diagnosis */}
          <Section label="Diagnosis">
            {lastVisit?.raw_transcript ? (
              <div className="bg-surface rounded-xl border border-border shadow-sm px-4 py-3">
                <p className="text-sm text-text-primary leading-relaxed">{lastVisit.raw_transcript}</p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary italic">No diagnosis recorded yet</p>
            )}
          </Section>

          {/* Current Treatment */}
          {lastVisit && (
            <Section label="Current Treatment">
              <div className="bg-surface rounded-xl border border-border shadow-sm px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {lastVisit.procedure_name}
                    {lastVisit.tooth_number && (
                      <span className="ml-1.5 text-xs font-normal text-accent bg-accent-light px-1.5 py-0.5 rounded">
                        Tooth {lastVisit.tooth_number}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">{formatDate(lastVisit.visit_date)}</p>
                </div>
                <StatusBadge status={lastVisit.status} />
              </div>
            </Section>
          )}

          {/* Treatment History */}
          <Section label="Treatment History" count={visits.length}>
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
                {visits.map((visit) => <VisitCard key={visit.id} visit={visit} />)}
              </div>
            )}
          </Section>

          {/* Upcoming appointments */}
          {upcomingAppointments.length > 0 && (
            <Section label="Appointments" count={upcomingAppointments.length}>
              <div className="space-y-2">
                {upcomingAppointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    onMarkDone={() => markAppointmentDone(appt.id)}
                    onEdit={() => router.push(
                      `/appointments/schedule/?appointmentId=${appt.id}&patientId=${id}&patientName=${encodeURIComponent(patient.name)}`
                    )}
                  />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* ── HISTORY ── */}
      {activeTab === 'History' && (
        <div className="px-5 py-4 space-y-2.5">
          {appointments.length === 0 ? (
            <EmptyState icon={Calendar} title="No appointments" subtitle="Scheduled and past appointments appear here" />
          ) : (
            appointments.map((appt) => {
              const visitOnDate = visits.find((v) => v.visit_date === appt.appointment_date);
              const d = new Date(appt.appointment_date + 'T00:00:00');
              return (
                <div key={appt.id} className="bg-surface rounded-xl border border-border shadow-sm px-4 py-3 flex items-center gap-3">
                  <div className="w-12 flex-shrink-0 text-center">
                    <p className="text-[10px] font-medium uppercase text-text-secondary">
                      {d.toLocaleDateString('en', { month: 'short' })}
                    </p>
                    <p className="text-lg font-bold text-text-primary leading-none">{d.getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {appt.purpose || visitOnDate?.procedure_name || 'Appointment'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-text-secondary">{formatTime12(appt.appointment_time)}</span>
                      {visitOnDate?.cost != null && visitOnDate.cost > 0 && (
                        <span className="text-xs font-semibold text-success">
                          ₹{parseFloat(String(visitOnDate.cost)).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── COMPLICATIONS ── */}
      {activeTab === 'Complications' && (
        <ComplicationsTab patient={patient} onSaved={() => { qc.invalidateQueries({ queryKey: ['patient', id] }); refetch(); }} />
      )}

      {/* ── TEETH ── */}
      {activeTab === 'Teeth' && (
        <div className="px-5 py-5">
          {toothLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="bg-surface rounded-xl border border-border shadow-sm p-4 mb-4">
                <p className="text-xs font-semibold text-text-secondary mb-3 text-center">Tap a tooth to see details</p>
                <ToothChart
                  toothData={toothHistoryData?.toothMap ?? []}
                  onToothClick={handleToothClick}
                  highlightedTooth={selectedTooth?.toothNumber}
                />
              </div>

              {toothHistoryData && toothHistoryData.toothMap.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-text-secondary tracking-widest uppercase mb-3">Treated Teeth</p>
                  <div className="space-y-2">
                    {toothHistoryData.toothMap.map((tooth) => (
                      <button
                        key={tooth.toothNumber}
                        onClick={() => setSelectedTooth(tooth)}
                        className="w-full bg-surface rounded-xl border border-border shadow-sm px-4 py-3 flex items-center gap-3 text-left press-effect"
                      >
                        <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-accent">{tooth.toothNumber}</span>
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
              ) : (
                <EmptyState icon={Map} title="No tooth records" subtitle="Record visits with tooth numbers to populate the chart" />
              )}
            </>
          )}
          <ToothDetailSheet tooth={selectedTooth} onClose={() => setSelectedTooth(null)} />
        </div>
      )}
    </div>
  );
}

// ── AI Summary Card ──
function AiSummaryCard({ lastVisit, nextAppt, totalBilled, hasVisits }: {
  lastVisit?: Visit; nextAppt?: Appointment; totalBilled: number; hasVisits: boolean;
}) {
  return (
    <div className="bg-accent-light border border-accent/30 rounded-xl px-4 py-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-semibold text-accent uppercase tracking-wide">Patient Summary</span>
      </div>

      {!hasVisits ? (
        <p className="text-sm text-text-secondary italic">
          No visits recorded yet — record the first visit to see a summary
        </p>
      ) : (
        <div className="space-y-0">
          <SummaryRow
            label="Last Visit"
            value={lastVisit ? (
              <>
                {lastVisit.procedure_name}{lastVisit.tooth_number && ` · Tooth ${lastVisit.tooth_number}`}
                <span className="block text-xs font-normal text-text-secondary mt-0.5 capitalize">
                  {lastVisit.status.replace('_', ' ')} · {formatDate(lastVisit.visit_date)}
                </span>
              </>
            ) : '—'}
            first
          />
          {lastVisit?.next_steps && <SummaryRow label="Pending" value={lastVisit.next_steps} />}
          {nextAppt && (
            <SummaryRow
              label="Next Appt"
              value={`${formatDate(nextAppt.appointment_date)} · ${formatTime12(nextAppt.appointment_time)}`}
            />
          )}
          {totalBilled > 0 && (
            <SummaryRow label="Total Billed" value={`₹${totalBilled.toLocaleString('en-IN')}`} />
          )}
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value, first }: { label: string; value: React.ReactNode; first?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 py-2.5 ${first ? '' : 'border-t border-accent/10'}`}>
      <span className="text-xs text-text-secondary flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-text-primary text-right">{value}</span>
    </div>
  );
}

// ── Complications Tab ──
const FLAG_DEFS: { key: keyof ClinicalFlags; label: string; icon: React.ReactNode }[] = [
  { key: 'bloodThinner', label: 'Blood Thinner', icon: <Droplet className="w-4 h-4" /> },
  { key: 'diabetes', label: 'Diabetes', icon: <Syringe className="w-4 h-4" /> },
  { key: 'heartCondition', label: 'Heart Condition', icon: <Heart className="w-4 h-4" /> },
  { key: 'pregnancy', label: 'Pregnancy', icon: <Baby className="w-4 h-4" /> },
];

function ComplicationsTab({ patient, onSaved }: { patient: Patient; onSaved: () => void }) {
  const [flags, setFlags] = useState<ClinicalFlags>(patient.clinical_flags ?? {});
  const [notes, setNotes] = useState(patient.clinical_flags?.notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFlags(patient.clinical_flags ?? {});
    setNotes(patient.clinical_flags?.notes ?? '');
  }, [patient.clinical_flags]);

  const persist = async (next: ClinicalFlags) => {
    setSaving(true);
    try {
      await patientsApi.update(patient.id, { clinical_flags: next });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = (key: keyof ClinicalFlags) => {
    const next = { ...flags, [key]: !flags[key] };
    setFlags(next);
    persist(next);
  };

  const saveNotes = async () => {
    setEditingNotes(false);
    await persist({ ...flags, notes });
  };

  return (
    <div className="px-5 py-4 space-y-6">
      <Section label="Medical Conditions">
        {patient.medical_conditions ? (
          <div className="bg-surface rounded-xl border border-border shadow-sm px-4 py-3 flex items-start gap-2">
            <Activity className="w-4 h-4 text-text-secondary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-primary">{patient.medical_conditions}</p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary italic">None recorded</p>
        )}
      </Section>

      <Section label="Allergies">
        {patient.allergies ? (
          <div className="bg-error-light border-l-4 border-l-error rounded-r-xl px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error">{patient.allergies}</p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary italic">None recorded</p>
        )}
      </Section>

      <Section label="Notes" action={
        editingNotes ? (
          <button onClick={saveNotes} className="text-accent flex items-center gap-1 text-xs font-semibold">
            <Check className="w-3.5 h-3.5" /> Save
          </button>
        ) : (
          <button onClick={() => setEditingNotes(true)} className="text-text-secondary flex items-center gap-1 text-xs font-semibold">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        )
      }>
        {editingNotes ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Add clinical notes…"
            className="w-full bg-surface-subtle border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent transition-colors resize-none"
          />
        ) : notes ? (
          <div className="bg-surface rounded-xl border border-border shadow-sm px-4 py-3">
            <p className="text-sm text-text-primary whitespace-pre-wrap">{notes}</p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary italic">No notes yet</p>
        )}
      </Section>

      <Section label="Clinical Flags">
        <div className="flex flex-wrap gap-2">
          {FLAG_DEFS.map(({ key, label, icon }) => {
            const active = !!flags[key];
            return (
              <button
                key={key}
                onClick={() => toggleFlag(key)}
                disabled={saving}
                className={`flex items-center gap-1.5 px-3 h-9 rounded-full border text-xs font-medium transition-colors ${
                  active
                    ? 'bg-error-light border-error text-error'
                    : 'bg-surface-muted border-border text-text-secondary'
                }`}
              >
                {icon}{label}
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ── Shared bits ──
function Section({ label, count, action, children }: {
  label: string; count?: number; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold text-text-secondary tracking-widest uppercase">
          {label}{count != null && <span className="ml-1.5 text-text-disabled normal-case tracking-normal">({count})</span>}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function ActionChip({ icon, label, highlight, onClick }: {
  icon: React.ReactNode; label: string; highlight?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm press-effect ${
        highlight ? 'bg-accent-light border-[1.5px] border-accent' : 'bg-surface border-border'
      }`}
    >
      <span className="text-accent">{icon}</span>
      <span className="text-sm font-medium text-accent whitespace-nowrap">{label}</span>
    </button>
  );
}

function AppointmentCard({ appt, onMarkDone, onEdit }: {
  appt: Appointment; onMarkDone: () => void; onEdit: () => void;
}) {
  const today = todayStr();
  const isToday = appt.appointment_date === today;
  const d = new Date(appt.appointment_date + 'T00:00:00');

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`w-12 h-14 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
          isToday ? 'bg-accent' : 'bg-accent-light'
        }`}>
          <span className={`text-[10px] font-medium uppercase ${isToday ? 'text-white/80' : 'text-accent'}`}>
            {d.toLocaleDateString('en', { month: 'short' })}
          </span>
          <span className={`text-lg font-bold leading-none ${isToday ? 'text-white' : 'text-accent'}`}>
            {d.getDate()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
            <span className="text-sm font-semibold text-text-primary">{formatTime12(appt.appointment_time)}</span>
            {isToday && <span className="text-[10px] font-semibold text-accent bg-accent-light px-1.5 py-0.5 rounded-full">TODAY</span>}
          </div>
          {appt.purpose && <p className="text-xs text-text-secondary mt-0.5 truncate">{appt.purpose}</p>}
          {appt.tooth_number && (
            <span className="inline-block mt-1 text-[10px] bg-accent-light text-accent px-1.5 py-0.5 rounded font-medium">
              Tooth {appt.tooth_number}
            </span>
          )}
          <StatusBadge status={appt.status} className="mt-1.5" />
        </div>
      </div>
      <div className="border-t border-divider flex divide-x divide-divider">
        <button onClick={onEdit} className="flex-1 py-2 text-xs font-semibold text-accent flex items-center justify-center gap-1.5">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
        {appt.status === 'scheduled' && (
          <button onClick={onMarkDone} className="flex-1 py-2 text-xs font-semibold text-success flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Attended
          </button>
        )}
      </div>
    </div>
  );
}

function VisitCard({ visit }: { visit: Visit }) {
  const statusColors: Record<string, string> = {
    completed: 'border-l-success',
    in_progress: 'border-l-accent',
    pending: 'border-l-amber',
    cancelled: 'border-l-border',
  };
  return (
    <div className={`bg-surface rounded-xl border border-border shadow-sm border-l-4 ${statusColors[visit.status] || 'border-l-border'} overflow-hidden`}>
      <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            {visit.procedure_name}
            {visit.tooth_number && (
              <span className="ml-1.5 text-xs font-normal text-accent bg-accent-light px-1.5 py-0.5 rounded">
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
      <div className="px-4 pb-3.5 space-y-2.5">
        {visit.notes && <DetailRow icon={<FileText className="w-3.5 h-3.5" />} label="Clinical Notes" value={visit.notes} />}
        {visit.medications && <DetailRow icon={<Pill className="w-3.5 h-3.5" />} label="Medications" value={visit.medications} />}
        {visit.next_steps && <DetailRow icon={<ChevronRight className="w-3.5 h-3.5" />} label="Next Steps" value={visit.next_steps} />}
        {visit.follow_up_date && !visit.follow_up_done && (
          <div className="flex items-center gap-2 bg-amber-light border border-amber-border rounded-lg px-3 py-2 mt-1">
            <Calendar className="w-3.5 h-3.5 text-amber-dark flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-amber-dark">Follow-up: </span>
              <span className="text-xs text-amber-dark">{formatDate(visit.follow_up_date)}</span>
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
