import { cn } from '@/lib/utils';
import type { VisitStatus, AppointmentStatus } from '@/types';

type Status = VisitStatus | AppointmentStatus | 'today' | 'overdue' | 'upcoming';

const configs: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: 'bg-success-light', text: 'text-success', label: 'Completed' },
  scheduled: { bg: 'bg-warning-light', text: 'text-warning', label: 'Upcoming' },
  upcoming: { bg: 'bg-warning-light', text: 'text-warning', label: 'Upcoming' },
  in_progress: { bg: 'bg-info-light', text: 'text-info', label: 'In Progress' },
  pending: { bg: 'bg-warning-light', text: 'text-warning', label: 'Pending' },
  missed: { bg: 'bg-error-light', text: 'text-error', label: 'Missed' },
  cancelled: { bg: 'bg-app-surface-variant', text: 'text-text-secondary', label: 'Cancelled' },
  rescheduled: { bg: 'bg-info-light', text: 'text-info', label: 'Rescheduled' },
  today: { bg: 'bg-primary-surface', text: 'text-primary', label: 'Today' },
  overdue: { bg: 'bg-error-light', text: 'text-error', label: 'Overdue' },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = configs[status] || configs.pending;
  return (
    <span className={cn(
      'inline-flex items-center h-6 px-2 rounded-full text-[11px] font-semibold tracking-wide',
      config.bg,
      config.text,
      className
    )}>
      {config.label}
    </span>
  );
}
