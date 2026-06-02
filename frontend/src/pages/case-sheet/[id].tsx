import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Pill, Image as ImageIcon, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { caseSheetApi } from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/utils';
import { getInitials } from '@/lib/utils';
import type { CaseSheet, TreatmentPlan, VisitNote, Prescription, XRay } from '@/types';
import { useState } from 'react';

function progressPercent(plan: TreatmentPlan) {
  return plan.total_sittings > 0 ? plan.completed_sittings / plan.total_sittings : 0;
}

function CostChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-text-secondary">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function VisitRow({ visit }: { visit: CaseSheet['visits'][0] }) {
  const [open, setOpen] = useState(false);
  const d = new Date(visit.visit_date + 'T00:00:00');
  const notes: VisitNote[] = (visit as any).visit_notes || [];
  return (
    <div className="bg-surface border border-border rounded-xl mb-2.5 overflow-hidden">
      <button className="w-full text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-12 bg-accent-light rounded-lg flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-medium text-accent">{d.toLocaleDateString('en', { month: 'short' })}</span>
            <span className="text-base font-bold text-accent leading-none">{d.getDate()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{visit.procedure_name}</p>
            {visit.tooth_number && <p className="text-xs text-text-secondary">Tooth {visit.tooth_number}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={visit.status} />
            {visit.cost && visit.cost > 0 && (
              <span className="text-xs font-semibold text-success">₹{Number(visit.cost).toLocaleString('en-IN')}</span>
            )}
            {open ? <ChevronUp className="w-4 h-4 text-text-disabled" /> : <ChevronDown className="w-4 h-4 text-text-disabled" />}
          </div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-divider pt-2 space-y-2">
          {notes.length > 0 ? notes.map(note => (
            <div key={note.id} className="bg-surface-subtle rounded-lg p-3">
              <p className="text-[10px] font-semibold text-text-secondary uppercase mb-1">Note {note.note_number}</p>
              {note.notes && <p className="text-xs text-text-primary leading-relaxed">{note.notes}</p>}
              {note.medications && (
                <div className="flex items-center gap-1 mt-1">
                  <Pill className="w-3 h-3 text-text-disabled" />
                  <span className="text-xs text-text-secondary">{note.medications}</span>
                </div>
              )}
            </div>
          )) : (
            visit.notes ? (
              <p className="text-xs text-text-primary leading-relaxed">{visit.notes}</p>
            ) : (
              <p className="text-xs text-text-disabled italic">No notes recorded</p>
            )
          )}
          {(visit as any).follow_up_date && (
            <div className="bg-amber-light rounded-md px-3 py-1.5">
              <p className="text-xs text-amber-dark font-medium">Follow-up: {formatDate((visit as any).follow_up_date)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CaseSheetPage() {
  const router = useRouter();
  const { id } = router.query as { id: string };

  const { data, isLoading, isError, refetch } = useQuery<CaseSheet>({
    queryKey: ['case-sheet', id],
    queryFn: () => caseSheetApi.get(id).then(r => r.data),
    enabled: !!id,
    retry: 2,
  });

  const handleShare = () => {
    if (!data) return;
    const p = data.patient;
    const plans = data.activeTreatmentPlans.map(pl => `${pl.procedure_name}: ${pl.completed_sittings}/${pl.total_sittings} sittings`).join('\n');
    const text = `Case Sheet — ${p.name}\n\nActive Treatments:\n${plans || 'None'}\n\nTotal Visits: ${data.summary.totalVisits}\nTotal Billed: ₹${data.summary.totalBilled.toLocaleString('en-IN')}\nPending: ₹${data.summary.pendingAmount.toLocaleString('en-IN')}`;
    if (navigator.share) navigator.share({ text });
    else navigator.clipboard?.writeText(text);
  };

  if (!id || isLoading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-secondary">Loading case sheet…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">Case Sheet</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-error-light flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-base font-semibold text-text-primary mb-2">Couldn't load case sheet</p>
          <p className="text-sm text-text-secondary mb-6">Make sure the backend is running and the patient exists.</p>
          <button
            onClick={() => refetch()}
            className="px-6 h-11 bg-accent text-white rounded-xl text-sm font-semibold press-effect"
          >
            Retry
          </button>
          <button
            onClick={() => router.back()}
            className="mt-3 text-sm text-text-secondary underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { patient, activeTreatmentPlans, visits, prescriptions, xrays, summary } = data;

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-text-primary">Case Sheet</h1>
        <button onClick={handleShare} className="p-1 text-accent">
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Patient Hero */}
      <div className="bg-gradient-to-r from-accent to-accent-dark px-5 py-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-white">{getInitials(patient.name)}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{patient.name}</h2>
            <p className="text-sm text-white/70">
              {[patient.age && `${patient.age}y`, patient.gender, patient.phone].filter(Boolean).join(' · ')}
            </p>
            {patient.allergies && (
              <div className="mt-1 inline-flex items-center gap-1 bg-error/20 px-2 py-0.5 rounded-full">
                <span className="text-xs text-white">⚠ Allergy: {patient.allergies}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-6">
        {/* Active Treatments */}
        {activeTreatmentPlans.length > 0 && (
          <section>
            <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-3">Active Treatments</p>
            {activeTreatmentPlans.map(plan => (
              <button
                key={plan.id}
                onClick={() => router.push(`/treatment-plan/${plan.id}?patientId=${patient.id}`)}
                className="w-full text-left bg-surface border border-border rounded-xl p-4 mb-2.5 shadow-card"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-text-primary">{plan.procedure_name}</p>
                  <StatusBadge status={plan.status as any} />
                </div>
                {plan.diagnosis && <p className="text-xs text-text-secondary mb-2">{plan.diagnosis}</p>}
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-accent">{plan.completed_sittings}/{plan.total_sittings} sittings</p>
                  <p className="text-xs font-medium text-accent">{Math.round(progressPercent(plan) * 100)}%</p>
                </div>
                <div className="h-2 bg-accent-light rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progressPercent(plan) * 100}%` }} />
                </div>
                <div className="flex justify-around mt-3">
                  <CostChip label="Estimated" value={`₹${Number(plan.estimated_cost).toLocaleString('en-IN')}`} color="text-text-primary" />
                  <CostChip label="Collected" value={`₹${Number(plan.collected_amount).toLocaleString('en-IN')}`} color="text-success" />
                  <CostChip label="Pending" value={`₹${Number(plan.pending_amount).toLocaleString('en-IN')}`} color="text-error" />
                </div>
              </button>
            ))}
          </section>
        )}

        {/* Billing Summary */}
        <section>
          <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-3">Billing Summary</p>
          <div className="bg-accent-subtle border border-accent/20 rounded-xl p-4">
            <div className="flex justify-around">
              <CostChip label="Total Planned" value={`₹${summary.totalPlannedCost.toLocaleString('en-IN')}`} color="text-text-primary" />
              <CostChip label="Collected" value={`₹${summary.totalCollected.toLocaleString('en-IN')}`} color="text-success" />
              <CostChip label="Pending" value={`₹${summary.pendingAmount.toLocaleString('en-IN')}`} color="text-error" />
            </div>
            <div className="flex justify-around mt-3 pt-3 border-t border-accent/10">
              <CostChip label="Total Visits" value={String(summary.totalVisits)} color="text-text-primary" />
              <CostChip label="X-Rays" value={String(summary.totalXrays)} color="text-text-primary" />
              <CostChip label="Prescriptions" value={String(summary.totalPrescriptions)} color="text-text-primary" />
            </div>
          </div>
        </section>

        {/* Visit History */}
        <section>
          <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-3">
            Visit History ({visits.length})
          </p>
          {visits.length === 0 ? (
            <p className="text-sm text-text-disabled italic">No visits recorded yet</p>
          ) : (
            visits.map(v => <VisitRow key={v.id} visit={v} />)
          )}
        </section>

        {/* Prescriptions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase">
              Prescriptions ({prescriptions.length})
            </p>
            <button
              onClick={() => router.push(`/prescription/new?patientId=${patient.id}&patientName=${encodeURIComponent(patient.name)}`)}
              className="text-xs font-semibold text-accent flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          {prescriptions.length === 0 ? (
            <p className="text-sm text-text-disabled italic">No prescriptions yet</p>
          ) : (
            prescriptions.map(rx => (
              <button
                key={rx.id}
                onClick={() => router.push(`/prescription/${rx.id}`)}
                className="w-full flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-3 mb-2 shadow-card text-left"
              >
                <div className="w-9 h-9 bg-accent-light rounded-lg flex items-center justify-center flex-shrink-0">
                  <Pill className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-primary">{rx.medicines.length} medicine(s)</p>
                  <p className="text-xs text-text-secondary">{formatDate(rx.created_at)}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-text-disabled rotate-[-90deg]" />
              </button>
            ))
          )}
        </section>

        {/* X-Rays */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase">
              X-Rays & Photos ({xrays.length})
            </p>
            <button
              onClick={() => router.push(`/xrays/${patient.id}?patientName=${encodeURIComponent(patient.name)}`)}
              className="text-xs font-semibold text-accent flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Upload
            </button>
          </div>
          {xrays.length === 0 ? (
            <p className="text-sm text-text-disabled italic">No X-rays uploaded yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {xrays.map(xray => (
                <button
                  key={xray.id}
                  onClick={() => router.push(`/xrays/${patient.id}?patientName=${encodeURIComponent(patient.name)}`)}
                  className="bg-surface border border-border rounded-xl overflow-hidden text-left"
                >
                  <div className="h-16 bg-surface-muted flex items-center justify-center">
                    <ImageIcon className="w-7 h-7 text-text-disabled" />
                  </div>
                  <div className="p-2">
                    <span className="text-[10px] font-semibold bg-accent-light text-accent px-1.5 py-0.5 rounded-full">
                      {xray.xray_type}
                    </span>
                    <p className="text-[10px] text-text-secondary mt-1">{formatDate(xray.date_taken)}</p>
                    {xray.tooth_number && <p className="text-[10px] text-accent">Tooth {xray.tooth_number}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
