import { useDroppable } from '@dnd-kit/core';
import type { Appointment } from '@/types';
import { SLOTS, label12, hhmm, apptsFor } from './calendarUtils';
import AppointmentBlock from './AppointmentBlock';

function Slot({ date, time, appts, onOpen, onEmptyTap }: {
  date: string;
  time: string;
  appts: Appointment[];
  onOpen: (a: Appointment) => void;
  onEmptyTap: (time: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${date}__${time}`, data: { date, time } });
  const inSlot = appts.filter((a) => hhmm(a.appointment_time) === time);

  return (
    <div className="flex items-stretch border-b border-divider min-h-[56px]">
      <div className="w-12 flex-shrink-0 pt-1 pr-1 text-right">
        <span className="text-[10px] text-text-secondary">{time.endsWith('00') ? label12(time) : ''}</span>
      </div>
      <div
        ref={setNodeRef}
        onClick={() => inSlot.length === 0 && onEmptyTap(time)}
        className={`flex-1 p-1 space-y-1 transition-colors ${
          isOver ? 'bg-accent-light border border-accent rounded-lg' : ''
        }`}
      >
        {inSlot.map((a) => (
          <AppointmentBlock key={a.id} appt={a} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export default function DayView({ date, appointments, onOpen, onEmptyTap }: {
  date: string;
  appointments: Appointment[];
  onOpen: (a: Appointment) => void;
  onEmptyTap: (time: string) => void;
}) {
  const dayAppts = apptsFor(appointments, date);

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      {SLOTS.map((time) => (
        <Slot key={time} date={date} time={time} appts={dayAppts} onOpen={onOpen} onEmptyTap={onEmptyTap} />
      ))}
    </div>
  );
}
