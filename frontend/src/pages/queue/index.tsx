import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import {
  ArrowLeft, UserCheck, ChevronUp, ChevronDown, AlertCircle,
  X, UserCog, Phone, RotateCcw
} from 'lucide-react';
import { queueApi, staffApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import type { QueueEntry, StaffMember } from '@/types';

const OUTCOME_LABELS: Record<string, string> = {
  diagnosis_only: 'Diagnosis only', treatment_done: 'Treatment done',
  treatment_postponed: 'Postponed', patient_declined: 'Declined',
  referred: 'Referred', follow_up_scheduled: 'Follow-up set',
  additional_sitting_required: 'Next sitting scheduled',
};

export default function QueuePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { role } = useAuthStore();

  const [reassignModalEntry, setReassignModalEntry] = useState<QueueEntry | null>(null);
  const [reorderLoading, setReorderLoading] = useState<string | null>(null);
  const [callingIn, setCallingIn] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ queue: QueueEntry[] }>({
    queryKey: ['queue'],
    queryFn: () => queueApi.list().then(r => r.data),
    refetchInterval: 20000,
  });

  const { data: staffData } = useQuery<{ staff: StaffMember[] }>({
    queryKey: ['staff'],
    queryFn: () => staffApi.list().then(r => r.data),
    enabled: !!reassignModalEntry,
  });

  const doctors = (staffData?.staff || []).filter(s => s.role === 'doctor');
  const queue = data?.queue || [];

  const waiting           = queue.filter(e => e.status === 'waiting');
  const inConsult         = queue.filter(e => e.status === 'in_consultation');
  const readyForCheckout  = queue.filter(e => e.status === 'ready_for_checkout');
  const skipped           = queue.filter(e => e.status === 'skipped');
  const done              = queue.filter(e => e.status === 'completed' || e.status === 'checked_out');

  const updateStatus = async (id: string, status: string) => {
    await queueApi.update(id, { status });
    qc.invalidateQueries({ queryKey: ['queue'] });
  };

  const updatePriority = async (id: string, priority: 'normal' | 'urgent') => {
    await queueApi.update(id, { priority });
    qc.invalidateQueries({ queryKey: ['queue'] });
  };

  const handleCallIn = async (id: string) => {
    setCallingIn(id);
    try {
      await queueApi.update(id, { status: 'in_consultation' });
      qc.invalidateQueries({ queryKey: ['queue'] });
    } finally { setCallingIn(null); }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    setReorderLoading(id + direction);
    try {
      await queueApi.reorder(id, direction);
      qc.invalidateQueries({ queryKey: ['queue'] });
    } finally { setReorderLoading(null); }
  };

  const handleReassign = async (entryId: string, doctorId: string) => {
    await queueApi.update(entryId, { assignedDoctor: doctorId });
    qc.invalidateQueries({ queryKey: ['queue'] });
    setReassignModalEntry(null);
  };

  const QueueCard = ({ entry, showReorder }: { entry: QueueEntry; showReorder?: boolean }) => {
    const isUrgent = entry.priority === 'urgent';
    return (
      <div className="bg-surface rounded-2xl overflow-hidden mb-2.5"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)', borderLeft: isUrgent ? '3px solid #FF3B30' : 'none' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          {role === 'receptionist' && showReorder && (
            <div className="flex flex-col gap-0.5 flex-shrink-0">
              <button onClick={() => handleReorder(entry.id, 'up')} disabled={reorderLoading === entry.id + 'up'}
                className="w-6 h-6 flex items-center justify-center rounded-md press-effect disabled:opacity-40"
                style={{ background: '#F2F2F7' }}>
                <ChevronUp className="w-3.5 h-3.5 text-text-secondary" />
              </button>
              <button onClick={() => handleReorder(entry.id, 'down')} disabled={reorderLoading === entry.id + 'down'}
                className="w-6 h-6 flex items-center justify-center rounded-md press-effect disabled:opacity-40"
                style={{ background: '#F2F2F7' }}>
                <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
              </button>
            </div>
          )}

          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] flex-shrink-0"
            style={{ background: isUrgent ? '#FFF1F0' : '#F2F2F7', color: isUrgent ? '#FF3B30' : '#1C1C1E' }}>
            {entry.token_number}
          </div>

          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 16, fontWeight: 600, color: '#1C1C1E' }}>{entry.patients?.name || '—'}</p>
            {entry.chief_complaint && (
              <p style={{ fontSize: 13, color: '#6E6E73', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.chief_complaint}
              </p>
            )}
            {entry.treatment_plans && (
              <p style={{ fontSize: 12, color: '#1B86B8', fontWeight: 500 }}>
                {entry.treatment_plans.procedure_name} · {entry.treatment_plans.completed_sittings}/{entry.treatment_plans.total_sittings} sittings
              </p>
            )}
            {entry.assigned_doctor_staff?.name && (
              <p style={{ fontSize: 12, color: '#6E6E73' }}>Dr. {entry.assigned_doctor_staff.name}</p>
            )}
            {entry.consultation_outcome && (
              <p style={{ fontSize: 12, color: '#6E6E73', fontStyle: 'italic' }}>
                {OUTCOME_LABELS[entry.consultation_outcome] || entry.consultation_outcome}
              </p>
            )}
          </div>
          <StatusBadge status={entry.status as any} />
        </div>

        {/* Actions row */}
        <div className="border-t flex divide-x" style={{ borderColor: 'rgba(60,60,67,0.08)' }}>

          {/* ─ DOCTOR actions ─ */}
          {role === 'doctor' && entry.status === 'in_consultation' && (
            <button onClick={() => router.push(`/consult/${entry.id}/`)}
              className="flex-1 py-2.5 text-xs font-semibold text-white flex items-center justify-center"
              style={{ background: '#1B86B8' }}>
              Continue →
            </button>
          )}
          {role === 'doctor' && entry.status === 'waiting' && (
            <button onClick={() => router.push(`/patients/${entry.patient_id}/`)}
              className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center" style={{ color: '#007AFF' }}>
              Profile
            </button>
          )}
          {role === 'doctor' && !['waiting', 'in_consultation'].includes(entry.status) && (
            <button onClick={() => router.push(`/patients/${entry.patient_id}/`)}
              className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center" style={{ color: '#007AFF' }}>
              Profile
            </button>
          )}

          {/* ─ RECEPTIONIST actions — waiting ─ */}
          {role === 'receptionist' && entry.status === 'waiting' && (
            <>
              <button
                onClick={() => handleCallIn(entry.id)}
                disabled={callingIn === entry.id}
                className="flex-1 py-2.5 text-xs font-semibold text-white flex items-center justify-center gap-1 disabled:opacity-60"
                style={{ background: '#1C1C1E' }}>
                <Phone className="w-3 h-3" />
                {callingIn === entry.id ? 'Calling…' : 'Call In'}
              </button>
              <button onClick={() => updatePriority(entry.id, isUrgent ? 'normal' : 'urgent')}
                className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1"
                style={{ color: isUrgent ? '#6E6E73' : '#FF3B30' }}>
                <AlertCircle className="w-3 h-3" />
                {isUrgent ? 'Normal' : 'Urgent'}
              </button>
              <button onClick={() => setReassignModalEntry(entry)}
                className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1 text-text-secondary">
                <UserCog className="w-3 h-3" /> Reassign
              </button>
              <button onClick={() => updateStatus(entry.id, 'skipped')}
                className="flex-1 py-2.5 text-xs font-semibold text-text-secondary flex items-center justify-center">
                <X className="w-3 h-3" />
              </button>
            </>
          )}

          {/* ─ RECEPTIONIST actions — ready for checkout ─ */}
          {role === 'receptionist' && entry.status === 'ready_for_checkout' && (
            <button onClick={() => router.push(`/checkout/${entry.id}/`)}
              className="flex-1 py-2.5 text-xs font-semibold text-white flex items-center justify-center"
              style={{ background: '#007AFF' }}>
              Open Checkout →
            </button>
          )}

          {/* ─ RECEPTIONIST actions — in_consultation (view only) ─ */}
          {role === 'receptionist' && entry.status === 'in_consultation' && (
            <button onClick={() => router.push(`/patients/${entry.patient_id}/`)}
              className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center" style={{ color: '#007AFF' }}>
              Profile
            </button>
          )}

          {/* ─ RECEPTIONIST — skipped: restore option ─ */}
          {role === 'receptionist' && entry.status === 'skipped' && (
            <>
              <button onClick={() => updateStatus(entry.id, 'waiting')}
                className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1"
                style={{ color: '#007AFF' }}>
                <RotateCcw className="w-3 h-3" /> Restore
              </button>
              <button onClick={() => router.push(`/patients/${entry.patient_id}/`)}
                className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center text-text-secondary">
                Profile
              </button>
            </>
          )}

          {/* ─ done / checked_out ─ */}
          {(entry.status === 'completed' || entry.status === 'checked_out') && (
            <button onClick={() => router.push(`/patients/${entry.patient_id}/`)}
              className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center" style={{ color: '#007AFF' }}>
              Profile
            </button>
          )}
        </div>
      </div>
    );
  };

  const hasAny = queue.length > 0;

  return (
    <div className="min-h-screen bg-bg pb-4">
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-[17px] font-semibold text-text-primary">Queue</h1>
        </div>
        {role === 'receptionist' && (
          <button onClick={() => router.push('/check-in/')}
            className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-white text-xs font-semibold"
            style={{ background: '#1C1C1E' }}>
            <UserCheck className="w-3.5 h-3.5" /> Check-in
          </button>
        )}
      </div>

      <div className="px-5 pt-5">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#1C1C1E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasAny ? (
          <EmptyState icon={UserCheck} title="Queue is empty"
            subtitle={role === 'receptionist' ? 'Tap Check-in to add patients' : 'No patients in queue today'} />
        ) : (
          <>
            {waiting.length > 0 && (
              <section className="mb-6">
                <p className="mb-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  Waiting · {waiting.length}
                  {role === 'receptionist' && <span className="normal-case font-normal"> · tap Call In to send to doctor</span>}
                </p>
                {waiting.map(e => <QueueCard key={e.id} entry={e} showReorder />)}
              </section>
            )}

            {inConsult.length > 0 && (
              <section className="mb-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#1B86B8' }}>
                  In Consultation · {inConsult.length}
                </p>
                {inConsult.map(e => <QueueCard key={e.id} entry={e} />)}
              </section>
            )}

            {readyForCheckout.length > 0 && (
              <section className="mb-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#007AFF' }}>
                  Ready for Checkout · {readyForCheckout.length}
                </p>
                {readyForCheckout.map(e => <QueueCard key={e.id} entry={e} />)}
              </section>
            )}

            {skipped.length > 0 && (
              <section className="mb-6">
                <p className="mb-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  Skipped · {skipped.length}
                  {role === 'receptionist' && <span className="normal-case font-normal"> · tap Restore to re-add to queue</span>}
                </p>
                {skipped.map(e => <QueueCard key={e.id} entry={e} />)}
              </section>
            )}

            {done.length > 0 && (
              <section>
                <p className="mb-3 text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  Completed · {done.length}
                </p>
                {done.map(e => <QueueCard key={e.id} entry={e} />)}
              </section>
            )}
          </>
        )}
      </div>

      {/* Reassign Doctor Modal */}
      {reassignModalEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setReassignModalEntry(null)}>
          <div className="bg-surface rounded-t-2xl w-full max-w-lg mx-auto p-5 pb-8" onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>Reassign Doctor</p>
            <p style={{ fontSize: 13, color: '#6E6E73', marginBottom: 16 }}>
              Currently: {reassignModalEntry.assigned_doctor_staff?.name ? `Dr. ${reassignModalEntry.assigned_doctor_staff.name}` : 'Any available'}
            </p>
            {doctors.length === 0 ? (
              <p style={{ fontSize: 14, color: '#AEAEB2' }}>No doctors found in this clinic.</p>
            ) : (
              <div className="space-y-2">
                <button onClick={() => handleReassign(reassignModalEntry.id, '')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl press-effect"
                  style={{ background: '#F2F2F7' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#6E6E73' }}>Any available doctor</p>
                </button>
                {doctors.map(doc => (
                  <button key={doc.id} onClick={() => handleReassign(reassignModalEntry.id, doc.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl press-effect"
                    style={{ background: reassignModalEntry.assigned_doctor === doc.id ? '#1C1C1E' : '#F2F2F7' }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: reassignModalEntry.assigned_doctor === doc.id ? 'rgba(255,255,255,0.15)' : '#E5E5EA', color: reassignModalEntry.assigned_doctor === doc.id ? '#fff' : '#1C1C1E' }}>
                      {(doc.name || 'D').charAt(0).toUpperCase()}
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: reassignModalEntry.assigned_doctor === doc.id ? '#fff' : '#1C1C1E' }}>
                      Dr. {doc.name || doc.phone}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
