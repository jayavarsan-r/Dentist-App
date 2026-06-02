import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Smartphone, Banknote, MoreHorizontal, CheckCircle2 } from 'lucide-react';
import AppButton from '@/components/shared/AppButton';
import { paymentsApi, treatmentPlansApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Payment, PaymentMethod, TreatmentPlan } from '@/types';

const METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
  { value: 'upi', label: 'UPI', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <MoreHorizontal className="w-4 h-4" /> },
];

export default function CollectPaymentPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { patientId, patientName, planId } = router.query as {
    patientId: string; patientName: string; planId?: string;
  };

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(planId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: plansData } = useQuery<{ plans: TreatmentPlan[] }>({
    queryKey: ['treatment-plans', patientId],
    queryFn: () => treatmentPlansApi.listForPatient(patientId).then((r) => r.data),
    enabled: !!patientId,
  });

  const { data: historyData, refetch: refetchHistory } = useQuery<{ payments: Payment[] }>({
    queryKey: ['payments', patientId],
    queryFn: () => paymentsApi.forPatient(patientId).then((r) => r.data),
    enabled: !!patientId,
  });

  const plans = plansData?.plans ?? [];
  const history = historyData?.payments ?? [];
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handleCollect = async () => {
    if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return; }
    if (!patientId) return;
    setSaving(true);
    setError('');
    try {
      await paymentsApi.create({
        patientId,
        treatmentPlanId: selectedPlanId || null,
        amount: parseFloat(amount),
        paymentMethod: method,
        notes: notes || null,
      });
      qc.invalidateQueries({ queryKey: ['payments', patientId] });
      qc.invalidateQueries({ queryKey: ['treatment-plans', patientId] });
      qc.invalidateQueries({ queryKey: ['patient', patientId] });
      setSuccess(true);
      setAmount('');
      setNotes('');
      refetchHistory();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Collect Payment</h1>
            {patientName && <p className="text-xs text-text-secondary">{patientName}</p>}
          </div>
        </div>
      </div>

      <div className="px-5 py-5 pb-36 space-y-5">
        {error && <div className="bg-error-light border border-error/30 rounded-xl p-3 text-sm text-error">{error}</div>}
        {success && (
          <div className="bg-success-light border border-success/30 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
            <p className="text-sm text-success font-medium">Payment recorded successfully</p>
          </div>
        )}

        {/* Amount */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <p className="text-[11px] font-semibold text-text-secondary tracking-widest uppercase mb-3">Amount</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-light text-text-secondary">₹</span>
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setSuccess(false); }}
              placeholder="0"
              className="flex-1 text-4xl font-bold text-text-primary bg-transparent focus:outline-none placeholder:text-text-disabled"
            />
          </div>
          {selectedPlan && selectedPlan.pending_amount > 0 && (
            <button
              onClick={() => setAmount(String(selectedPlan.pending_amount))}
              className="mt-3 text-xs font-semibold text-accent underline"
            >
              Use pending amount: ₹{Number(selectedPlan.pending_amount).toLocaleString('en-IN')}
            </button>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <p className="text-[11px] font-semibold text-text-secondary tracking-widest uppercase mb-3">Payment Method</p>
          <div className="grid grid-cols-4 gap-2">
            {METHOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMethod(opt.value)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors ${
                  method === opt.value
                    ? 'bg-accent-light border-accent text-accent'
                    : 'bg-surface border-border text-text-secondary'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Treatment Plan */}
        {plans.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-text-secondary tracking-widest uppercase mb-3">Against Treatment Plan (Optional)</p>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedPlanId('')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left ${
                  !selectedPlanId ? 'bg-accent-light border-accent' : 'bg-surface border-border'
                }`}
              >
                <span className={`text-sm font-medium ${!selectedPlanId ? 'text-accent' : 'text-text-secondary'}`}>
                  General / No plan
                </span>
              </button>
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left ${
                    selectedPlanId === plan.id ? 'bg-accent-light border-accent' : 'bg-surface border-border'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${selectedPlanId === plan.id ? 'text-accent' : 'text-text-primary'}`}>
                      {plan.procedure_name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {plan.completed_sittings}/{plan.total_sittings} sittings
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    {plan.pending_amount > 0 && (
                      <p className="text-xs font-bold text-error">₹{Number(plan.pending_amount).toLocaleString('en-IN')} pending</p>
                    )}
                    {plan.collected_amount > 0 && (
                      <p className="text-xs text-success">₹{Number(plan.collected_amount).toLocaleString('en-IN')} paid</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <p className="text-[11px] font-semibold text-text-secondary tracking-widest uppercase mb-3">Notes (Optional)</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Part payment for crown, advance collected..."
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent transition-colors resize-none"
          />
        </div>

        {/* Payment History */}
        {history.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-text-secondary tracking-widest uppercase mb-3">Payment History</p>
            <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-sm">
              {history.map((payment, i) => (
                <div key={payment.id}>
                  {i > 0 && <div className="h-px bg-divider mx-4" />}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-9 h-9 bg-success-light rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">
                        ₹{Number(payment.amount).toLocaleString('en-IN')}
                        <span className="ml-2 text-[10px] font-normal text-text-secondary capitalize">
                          {payment.payment_method}
                        </span>
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatDate(payment.payment_date)}
                        {payment.treatment_plans?.procedure_name && ` · ${payment.treatment_plans.procedure_name}`}
                      </p>
                      {payment.notes && <p className="text-xs text-text-secondary mt-0.5 italic">{payment.notes}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface border-t border-border px-5 py-4 pb-6">
        <AppButton onClick={handleCollect} isLoading={saving}>
          Collect ₹{amount ? Number(amount).toLocaleString('en-IN') : '—'}
        </AppButton>
      </div>
    </div>
  );
}
