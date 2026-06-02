import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { treatmentPlansApi } from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import AppButton from '@/components/shared/AppButton';
import { formatDate } from '@/lib/utils';
import type { TreatmentPlan } from '@/types';

function progressPercent(plan: TreatmentPlan) {
  return plan.total_sittings > 0 ? plan.completed_sittings / plan.total_sittings : 0;
}

function FinanceRow({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold' : 'font-semibold'} ${color}`}>{value}</span>
    </div>
  );
}

export default function TreatmentPlanPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id: planId, patientId } = router.query as { id: string; patientId?: string };
  const [showAmountDialog, setShowAmountDialog] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery<{ plan: TreatmentPlan }>({
    queryKey: ['treatment-plan', planId],
    queryFn: () => treatmentPlansApi.getById(planId).then(r => r.data),
    enabled: !!planId,
  });

  const plan = data?.plan;

  const handleUpdateAmount = async () => {
    if (!plan || !newAmount) return;
    setSaving(true);
    try {
      await treatmentPlansApi.update(plan.id, { collectedAmount: parseFloat(newAmount) });
      await refetch();
      qc.invalidateQueries({ queryKey: ['patient', patientId] });
      setShowAmountDialog(false);
      setNewAmount('');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !plan) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pct = progressPercent(plan);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-text-primary truncate mx-4">{plan.procedure_name}</h1>
        <StatusBadge status={plan.status as any} />
      </div>

      <div className="px-5 pt-5 space-y-6">
        {/* Progress Hero */}
        <div className="bg-surface border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-semibold text-text-primary">{plan.procedure_name}</p>
              {plan.diagnosis && <p className="text-sm text-text-secondary mt-0.5">{plan.diagnosis}</p>}
            </div>
          </div>
          <div className="flex flex-col items-center py-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#EDF4EE" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="#5F7A61" strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-accent">{plan.completed_sittings}</span>
                <span className="text-xs text-text-secondary">of {plan.total_sittings}</span>
              </div>
            </div>
            <p className="text-sm text-text-secondary mt-2">sittings completed</p>
          </div>
        </div>

        {/* Financials */}
        <section>
          <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-3">Financials</p>
          <div className="bg-surface border border-border rounded-xl px-4 shadow-card divide-y divide-divider">
            <FinanceRow label="Estimated Cost" value={`₹${Number(plan.estimated_cost).toLocaleString('en-IN')}`} color="text-text-primary" />
            <FinanceRow label="Collected" value={`₹${Number(plan.collected_amount).toLocaleString('en-IN')}`} color="text-success" />
            <FinanceRow label="Pending" value={`₹${Number(plan.pending_amount).toLocaleString('en-IN')}`} color="text-error" bold />
          </div>
          <div className="mt-3">
            <AppButton variant="secondary" size="md" onClick={() => {
              setNewAmount(String(plan.collected_amount));
              setShowAmountDialog(true);
            }}>
              Update Collected Amount
            </AppButton>
          </div>
        </section>

        {/* Sittings Timeline */}
        <section>
          <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-3">Sittings</p>
          <div className="space-y-0">
            {Array.from({ length: plan.total_sittings }, (_, i) => {
              const n = i + 1;
              const done = n <= plan.completed_sittings;
              const next = n === plan.completed_sittings + 1;
              const sittingVisit = plan.visits?.find(v => (v as any).sitting_number === n);

              return (
                <div key={n} className="flex items-start gap-3">
                  <div className="flex flex-col items-center flex-shrink-0 w-6">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                      done ? 'bg-accent border-accent text-white' :
                      next ? 'bg-amber-light border-amber text-amber-dark' :
                      'bg-surface-muted border-border text-text-disabled'
                    }`}>
                      {done ? <Check className="w-3 h-3" /> : n}
                    </div>
                    {n < plan.total_sittings && (
                      <div className={`w-0.5 h-8 ${done ? 'bg-accent' : 'bg-border'}`} />
                    )}
                  </div>
                  <div className={`flex-1 bg-surface border rounded-xl px-3 py-2.5 mb-2 ${
                    next ? 'border-amber' : 'border-border'
                  }`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${
                        done ? 'text-accent' : next ? 'text-amber-dark' : 'text-text-secondary'
                      }`}>
                        Sitting {n} — {done ? 'Completed' : next ? 'Next' : 'Pending'}
                      </p>
                      {sittingVisit ? (
                        <span className="text-xs text-text-secondary">{formatDate(sittingVisit.visit_date)}</span>
                      ) : next ? (
                        <StatusBadge status="upcoming" />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Linked Appointments */}
        {plan.appointments && plan.appointments.length > 0 && (
          <section>
            <p className="text-[10px] font-semibold text-text-secondary tracking-widest uppercase mb-3">Upcoming Appointments</p>
            {plan.appointments.map(appt => (
              <div key={appt.id} className="bg-surface border border-border rounded-xl px-4 py-3 mb-2 shadow-card flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-primary">{appt.purpose || 'Appointment'}</p>
                  <p className="text-xs text-text-secondary">{formatDate(appt.appointment_date)}</p>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </section>
        )}
      </div>

      {/* Amount Dialog */}
      {showAmountDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-surface rounded-t-2xl w-full max-w-lg p-6 pb-10">
            <h3 className="text-base font-bold text-text-primary mb-4">Update Collected Amount</h3>
            <div className="flex items-center gap-2 bg-surface-subtle border border-border rounded-xl px-4 h-12 mb-4">
              <span className="text-text-secondary font-medium">₹</span>
              <input
                type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)}
                autoFocus className="flex-1 bg-transparent text-text-primary focus:outline-none"
                placeholder="0"
              />
            </div>
            <div className="flex gap-3">
              <AppButton variant="secondary" onClick={() => setShowAmountDialog(false)}>Cancel</AppButton>
              <AppButton onClick={handleUpdateAmount} isLoading={saving}>Save</AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
