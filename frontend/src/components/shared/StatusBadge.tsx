import { cn } from '@/lib/utils';
import type { VisitStatus, AppointmentStatus } from '@/types';

type Status = VisitStatus | AppointmentStatus | 'today' | 'overdue' | 'upcoming';

const configs: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: 'bg-success-light', text: 'text-success', label: 'Completed' },
  scheduled: { bg: 'bg-amber-light', text: 'text-amber', label: 'Upcoming' },
  upcoming: { bg: 'bg-amber-light', text: 'text-amber', label: 'Upcoming' },
  in_progress: { bg: 'bg-info-light', text: 'text-info', label: 'In Progress' },
  pending: { bg: 'bg-amber-light', text: 'text-amber', label: 'Pending' },
  missed: { bg: 'bg-error-light', text: 'text-error', label: 'Missed' },
  cancelled: { bg: 'bg-surface-muted', text: 'text-text-secondary', label: 'Cancelled' },
  rescheduled: { bg: 'bg-info-light', text: 'text-info', label: 'Rescheduled' },
  today: { bg: 'bg-accent-light', text: 'text-accent', label: 'Today' },
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
