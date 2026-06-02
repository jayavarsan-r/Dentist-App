import { cn } from '@/lib/utils';
import type { VisitStatus, AppointmentStatus } from '@/types';

type Status = VisitStatus | AppointmentStatus | 'today' | 'overdue' | 'upcoming' | 'active' | 'paused' | 'cancelled';

const configs: Record<string, { bg: string; text: string; label: string }> = {
  // Visit / appointment statuses
  completed:           { bg: 'rgba(52,199,89,0.14)',   text: '#1E8E3E',  label: 'Completed' },
  scheduled:           { bg: 'rgba(255,159,10,0.14)',  text: '#C77700',  label: 'Upcoming' },
  upcoming:            { bg: 'rgba(255,159,10,0.14)',  text: '#C77700',  label: 'Upcoming' },
  in_progress:         { bg: 'rgba(50,173,230,0.16)',  text: '#1B86B8',  label: 'In Progress' },
  pending:             { bg: 'rgba(60,60,67,0.08)',    text: '#6E6E73',  label: 'Pending' },
  missed:              { bg: 'rgba(255,59,48,0.12)',   text: '#FF3B30',  label: 'Missed' },
  cancelled:           { bg: 'rgba(60,60,67,0.08)',    text: '#6E6E73',  label: 'Cancelled' },
  rescheduled:         { bg: 'rgba(50,173,230,0.16)',  text: '#1B86B8',  label: 'Rescheduled' },
  today:               { bg: 'rgba(28,28,30,0.10)',    text: '#1C1C1E',  label: 'Today' },
  overdue:             { bg: 'rgba(255,59,48,0.12)',   text: '#FF3B30',  label: 'Overdue' },
  active:              { bg: 'rgba(255,159,10,0.14)',  text: '#C77700',  label: 'Active' },
  paused:              { bg: 'rgba(60,60,67,0.08)',    text: '#6E6E73',  label: 'Paused' },
  done:                { bg: 'rgba(52,199,89,0.14)',   text: '#1E8E3E',  label: 'Done' },
  arrived:             { bg: 'rgba(255,159,10,0.14)',  text: '#C77700',  label: 'Arrived' },
  confirmed:           { bg: 'rgba(60,60,67,0.08)',    text: '#6E6E73',  label: 'Confirmed' },
  // Queue statuses
  waiting:             { bg: 'rgba(255,159,10,0.14)',  text: '#C77700',  label: 'Waiting' },
  in_consultation:     { bg: 'rgba(50,173,230,0.16)',  text: '#1B86B8',  label: 'In Consult' },
  skipped:             { bg: 'rgba(60,60,67,0.08)',    text: '#6E6E73',  label: 'Skipped' },
  ready_for_checkout:  { bg: 'rgba(0,122,255,0.12)',   text: '#007AFF',  label: 'Checkout' },
  checked_out:         { bg: 'rgba(52,199,89,0.14)',   text: '#1E8E3E',  label: 'Checked Out' },
};

interface StatusBadgeProps { status: Status; className?: string; }

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const c = configs[status] || configs.pending;
  return (
    <span
      className={cn('inline-flex items-center h-[22px] px-2 rounded-[7px] text-[11px] font-semibold tracking-wide whitespace-nowrap', className)}
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}
