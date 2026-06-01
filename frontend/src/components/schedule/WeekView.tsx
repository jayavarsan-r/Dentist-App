import { useDroppable } from '@dnd-kit/core';
import type { Appointment } from '@/types';
import { SLOTS, label12, hhmm, toISODateLocal } from './calendarUtils';
import AppointmentBlock from './AppointmentBlock';

function Cell({ date, time, appts, onOpen, onEmptyTap, isToday }: {
  date: string;
  time: string;
  appts: Appointment[];
  onOpen: (a: Appointment) => void;
  onEmptyTap: (date: string, time: string) => void;
  isToday: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${date}__${time}`, data: { date, time } });
  const inCell = appts.filter((a) => a.appointment_date === date && hhmm(a.appointment_time) === time);

  return (
    <div
      ref={setNodeRef}
      onClick={() => inCell.length === 0 && onEmptyTap(date, time)}
      className={`flex-1 min-w-0 border-l border-divider p-0.5 space-y-0.5 transition-colors ${
        isOver ? 'bg-accent-light' : isToday ? 'bg-accent-subtle' : ''
      }`}
    >
      {inCell.map((a) => (
        <AppointmentBlock key={a.id} appt={a} onOpen={onOpen} compact />
      ))}
    </div>
  );
}

export default function WeekView({ days, appointments, onOpen, onEmptyTap }: {
  days: Date[];
  appointments: Appointment[];
  onOpen: (a: Appointment) => void;
  onEmptyTap: (date: string, time: string) => void;
}) {
  const todayISO = toISODateLocal(new Date());
  const dayISOs = days.map(toISODateLocal);
  const weekAppts = appointments.filter(
    (a) => dayISOs.includes(a.appointment_date) && a.status !== 'cancelled'
  );

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      {/* Day headers */}
      <div className="flex sticky top-0 bg-surface z-10 border-b border-border">
        <div className="w-10 flex-shrink-0" />
        {days.map((d) => {
          const iso = toISODateLocal(d);
          const isToday = iso === todayISO;
          return (
            <div key={iso} className={`flex-1 min-w-0 text-center py-1.5 ${isToday ? 'bg-accent-light' : ''}`}>
              <p className="text-[10px] text-text-secondary uppercase">{d.toLocaleDateString('en', { weekday: 'short' })}</p>
              <p className={`text-sm font-semibold ${isToday ? 'text-accent' : 'text-text-primary'}`}>{d.getDate()}</p>
            </div>
          );
        })}
      </div>

      {/* Time rows */}
      {SLOTS.map((time) => (
        <div key={time} className="flex items-stretch border-b border-divider min-h-[40px]">
          <div className="w-10 flex-shrink-0 pt-0.5 pr-1 text-right">
            <span className="text-[9px] text-text-secondary">{time.endsWith('00') ? label12(time).replace(':00', '') : ''}</span>
          </div>
          {days.map((d) => {
            const iso = toISODateLocal(d);
            return (
              <Cell
                key={iso}
                date={iso}
                time={time}
                appts={weekAppts}
                onOpen={onOpen}
                onEmptyTap={onEmptyTap}
                isToday={iso === todayISO}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
