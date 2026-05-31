import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { Plus } from 'lucide-react';
import { appointmentsApi } from '@/lib/api';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { formatTime12 } from '@/lib/utils';
import type { Appointment } from '@/types';
import { CalendarDays } from 'lucide-react';

function toISODateLocal(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const router = useRouter();
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(toISODateLocal(today));

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startDate = toISODateLocal(new Date(viewYear, viewMonth, 1));
  const endDate = toISODateLocal(new Date(viewYear, viewMonth + 1, 0));

  const { data } = useQuery<{ appointments: Appointment[] }>({
    queryKey: ['appointments', 'month', viewYear, viewMonth],
    queryFn: async () => {
      // Fetch all appointments for the month by querying a date range
      // The API supports ?date=, so we fetch multiple if needed, or just upcoming
      const res = await appointmentsApi.list();
      return res.data;
    },
  });

  const allAppts = data?.appointments ?? [];
  const apptDates = new Set(allAppts.map((a) => a.appointment_date));
  const selectedAppts = allAppts.filter((a) => a.appointment_date === selectedDate);

  // Build calendar grid
  const startDow = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();
  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="bg-app-surface border-b border-app-border px-5 pt-12 pb-3 sticky top-0 z-10">
        <h1 className="text-[22px] font-bold text-text-primary">Calendar</h1>
      </div>

      {/* Calendar */}
      <div className="bg-app-surface p-4 border-b border-app-border">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1 text-primary text-lg font-bold">‹</button>
          <h2 className="text-base font-semibold text-text-primary">{MONTHS[viewMonth]} {viewYear}</h2>
          <button onClick={nextMonth} className="p-1 text-primary text-lg font-bold">›</button>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-text-secondary py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === toISODateLocal(today);
            const isSelected = dateStr === selectedDate;
            const hasAppt = apptDates.has(dateStr);
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(dateStr)}
                className={`relative flex flex-col items-center justify-center h-9 rounded-full text-sm transition-colors ${
                  isSelected ? 'bg-primary text-white' :
                  isToday ? 'bg-primary-surface text-primary border border-primary' :
                  'text-text-primary hover:bg-app-surface-variant'
                }`}
              >
                {day}
                {hasAppt && !isSelected && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date appointments */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-base font-semibold text-text-primary">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-xs text-text-secondary">{selectedAppts.length} appointments</p>
          </div>
          <button
            onClick={() => router.push(`/appointments/schedule/`)}
            className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-md"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {selectedAppts.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No appointments" subtitle="Tap Add to schedule one" />
        ) : (
          selectedAppts.map((a) => (
            <button
              key={a.id}
              onClick={() => router.push(`/patients/${a.patient_id}/`)}
              className="w-full mb-3 bg-app-surface rounded-md border border-app-border shadow-card flex items-center gap-3 px-4 py-3.5 text-left press-effect"
            >
              <div className="w-14 text-center flex-shrink-0">
                <p className="text-sm font-semibold text-primary">{formatTime12(a.appointment_time).split(' ')[0]}</p>
                <p className="text-[10px] font-medium text-primary">{formatTime12(a.appointment_time).split(' ')[1]}</p>
              </div>
              <div className="w-px h-10 bg-app-border flex-shrink-0" />
              <div className="flex-1 min-w-0 ml-1">
                <p className="text-sm font-semibold text-text-primary truncate">{a.patients?.name}</p>
                <p className="text-xs text-text-secondary truncate">{a.purpose || 'Dental consultation'}</p>
              </div>
              <StatusBadge status={a.status} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
