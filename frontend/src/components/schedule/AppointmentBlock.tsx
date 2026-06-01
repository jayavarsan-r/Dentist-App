import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Appointment } from '@/types';
import { label12 } from './calendarUtils';

export default function AppointmentBlock({
  appt, onOpen, compact,
}: {
  appt: Appointment;
  onOpen: (a: Appointment) => void;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appt.id,
    data: { appt },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(appt)}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
      }}
      className={`block w-full text-left bg-accent-light border-l-4 border-accent rounded-r-lg px-2 py-1 overflow-hidden ${
        isDragging ? 'shadow-elevated z-50' : ''
      }`}
    >
      <p className="text-[11px] font-semibold text-accent-dark truncate leading-tight">
        {appt.patients?.name || 'Patient'}
      </p>
      {!compact && (
        <p className="text-[10px] text-text-secondary truncate leading-tight">
          {label12(appt.appointment_time)}{appt.purpose ? ` · ${appt.purpose}` : ''}
        </p>
      )}
    </button>
  );
}
