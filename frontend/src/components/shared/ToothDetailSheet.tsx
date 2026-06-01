import { useEffect } from 'react';
import { X, Calendar, IndianRupee, Clock, CheckCircle2 } from 'lucide-react';
import type { ToothData } from '@/types';

const FDI_NAMES: Record<string, string> = {
  '11': 'Upper Right Central Incisor', '12': 'Upper Right Lateral Incisor',
  '13': 'Upper Right Canine', '14': 'Upper Right 1st Premolar',
  '15': 'Upper Right 2nd Premolar', '16': 'Upper Right 1st Molar',
  '17': 'Upper Right 2nd Molar', '18': 'Upper Right 3rd Molar (Wisdom)',
  '21': 'Upper Left Central Incisor', '22': 'Upper Left Lateral Incisor',
  '23': 'Upper Left Canine', '24': 'Upper Left 1st Premolar',
  '25': 'Upper Left 2nd Premolar', '26': 'Upper Left 1st Molar',
  '27': 'Upper Left 2nd Molar', '28': 'Upper Left 3rd Molar (Wisdom)',
  '31': 'Lower Left Central Incisor', '32': 'Lower Left Lateral Incisor',
  '33': 'Lower Left Canine', '34': 'Lower Left 1st Premolar',
  '35': 'Lower Left 2nd Premolar', '36': 'Lower Left 1st Molar',
  '37': 'Lower Left 2nd Molar', '38': 'Lower Left 3rd Molar (Wisdom)',
  '41': 'Lower Right Central Incisor', '42': 'Lower Right Lateral Incisor',
  '43': 'Lower Right Canine', '44': 'Lower Right 1st Premolar',
  '45': 'Lower Right 2nd Premolar', '46': 'Lower Right 1st Molar',
  '47': 'Lower Right 2nd Molar', '48': 'Lower Right 3rd Molar (Wisdom)',
};

interface ToothDetailSheetProps {
  tooth: ToothData | null;
  onClose: () => void;
}

export default function ToothDetailSheet({ tooth, onClose }: ToothDetailSheetProps) {
  const isOpen = !!tooth;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-50 bg-surface rounded-t-2xl shadow-elevated transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '80vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {tooth && (
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 40px)' }}>
            {/* Header */}
            <div className="flex items-start justify-between px-5 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-lg bg-accent-light flex items-center justify-center">
                    <span className="text-sm font-bold text-accent">{tooth.toothNumber}</span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-text-primary">Tooth {tooth.toothNumber}</p>
                    <p className="text-xs text-text-secondary">{FDI_NAMES[tooth.toothNumber] || 'FDI Tooth'}</p>
                  </div>
                </div>
                <StatusChip status={tooth.overallStatus} />
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-surface-muted mt-1">
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            {/* Cost summary */}
            {tooth.totalCost > 0 && (
              <div className="mx-5 mb-4 bg-success-light border border-success-border rounded-lg px-4 py-3 flex items-center gap-3">
                <IndianRupee className="w-5 h-5 text-success flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-secondary">Total Billed</p>
                  <p className="text-base font-bold text-success">₹{tooth.totalCost.toLocaleString('en-IN')}</p>
                </div>
              </div>
            )}

            {/* Procedures */}
            {tooth.completedProcedures.length > 0 && (
              <div className="px-5 mb-4">
                <p className="text-[10px] font-semibold text-text-disabled uppercase tracking-widest mb-2">
                  Procedures ({tooth.completedProcedures.length})
                </p>
                <div className="space-y-2">
                  {tooth.completedProcedures.map((proc) => (
                    <div key={proc.visitId} className="bg-surface-subtle rounded-lg p-3 border border-border">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary">{proc.procedure}</p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {new Date(proc.date + 'T00:00:00').toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </p>
                          {proc.notes && (
                            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{proc.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <StatusDot status={proc.status} />
                          {proc.cost != null && (
                            <span className="text-xs font-semibold text-success">₹{proc.cost.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      </div>
                      {proc.followUpDate && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Calendar className="w-3 h-3 text-warning" />
                          <span className="text-xs text-warning">
                            Follow-up: {new Date(proc.followUpDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming appointments */}
            {tooth.upcomingAppointments.length > 0 && (
              <div className="px-5 mb-6">
                <p className="text-[10px] font-semibold text-text-disabled uppercase tracking-widest mb-2">
                  Upcoming ({tooth.upcomingAppointments.length})
                </p>
                <div className="space-y-2">
                  {tooth.upcomingAppointments.map((appt) => (
                    <div key={appt.appointmentId} className="bg-amber-light border border-amber-border rounded-lg px-3 py-2.5 flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-amber flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text-primary">
                          {new Date(appt.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {appt.time && ` at ${appt.time.slice(0, 5)}`}
                        </p>
                        {appt.purpose && <p className="text-xs text-text-secondary truncate">{appt.purpose}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {tooth.completedProcedures.length === 0 && tooth.upcomingAppointments.length === 0 && (
              <div className="px-5 pb-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
                <p className="text-sm text-text-secondary">No records for this tooth</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function StatusChip({ status }: { status: ToothData['overallStatus'] }) {
  const configs = {
    treated: { label: 'Treated', bg: 'bg-accent-light', text: 'text-accent' },
    pending: { label: 'Scheduled', bg: 'bg-amber-light', text: 'text-amber-dark' },
    treated_pending: { label: 'Treated + Scheduled', bg: 'bg-accent', text: 'text-white' },
  };
  const cfg = configs[status];
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-success',
    in_progress: 'bg-accent',
    pending: 'bg-amber',
    cancelled: 'bg-border',
  };
  return (
    <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${colors[status] || 'bg-border'}`} />
  );
}
