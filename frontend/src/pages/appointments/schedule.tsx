import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { ArrowLeft, X, ChevronLeft, ChevronRight } from 'lucide-react';
import AppButton from '@/components/shared/AppButton';
import PatientAvatar from '@/components/shared/PatientAvatar';
import ToothChart from '@/components/shared/ToothChart';
import DayView from '@/components/schedule/DayView';
import WeekView from '@/components/schedule/WeekView';
import { label12, toISODateLocal, weekDays } from '@/components/schedule/calendarUtils';
import { appointmentsApi, patientsApi } from '@/lib/api';
import { formatTime, TIME_SLOTS } from '@/lib/constants';
import type { Appointment, ToothHistoryResponse } from '@/types';

export default function SchedulePage() {
  const router = useRouter();
  const { patientId, appointmentId } = router.query as {
    patientId?: string; appointmentId?: string;
  };

  // Form mode when launched from a patient / appointment; calendar mode otherwise.
  const isFormMode = !!patientId || !!appointmentId;

  if (!router.isReady) return <div className="min-h-screen bg-bg" />;
  return isFormMode ? <ScheduleForm /> : <CalendarView />;
}

/* ───────────────────────── Calendar ───────────────────────── */

function CalendarView() {
  const router = useRouter();
  const qc = useQueryClient();
  const [view, setView] = useState<'day' | 'week'>('day');
  const [anchor, setAnchor] = useState(() => new Date());
  const [activeAppt, setActiveAppt] = useState<Appointment | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const { data } = useQuery<{ appointments: Appointment[] }>({
    queryKey: ['appointments', 'all'],
    queryFn: () => appointmentsApi.list().then((r) => r.data),
  });
  const appointments = data?.appointments ?? [];

  const dateISO = toISODateLocal(anchor);
  const days = useMemo(() => weekDays(anchor), [anchor]);

  const shift = (dir: number) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + dir * (view === 'day' ? 1 : 7));
    setAnchor(d);
  };

  const openAppt = (a: Appointment) => {
    router.push(
      `/appointments/schedule/?appointmentId=${a.id}&patientId=${a.patient_id}&patientName=${encodeURIComponent(a.patients?.name || '')}`
    );
  };
  // Creating needs a patient context — send the dentist to pick one.
  const emptyTap = () => router.push('/patients/');

  const onDragStart = (e: DragStartEvent) => {
    setActiveAppt((e.active.data.current as any)?.appt ?? null);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveAppt(null);
    const over = e.over;
    const appt = (e.active.data.current as any)?.appt as Appointment | undefined;
    if (!over || !appt) return;
    const { date, time } = over.data.current as { date: string; time: string };
    if (appt.appointment_date === date && appt.appointment_time.slice(0, 5) === time) return;

    // Optimistic update
    qc.setQueryData<{ appointments: Appointment[] }>(['appointments', 'all'], (prev) =>
      prev ? {
        appointments: prev.appointments.map((a) =>
          a.id === appt.id ? { ...a, appointment_date: date, appointment_time: time + ':00' } : a
        ),
      } : prev
    );
    try {
      await appointmentsApi.update(appt.id, { appointment_date: date, appointment_time: time + ':00' });
    } finally {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    }
  };

  const headerLabel = view === 'day'
    ? anchor.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    : `${days[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

  return (
    <div className="min-h-screen bg-bg">
      {/* AppBar */}
      <div className="bg-surface border-b border-border px-5 pt-12 pb-3 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">Calendar</h1>
          {/* View toggle */}
          <div className="flex items-center bg-surface-muted rounded-full p-0.5">
            {(['day', 'week'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${
                  view === v ? 'bg-accent text-white' : 'text-text-secondary'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        {/* Date nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => shift(-1)} className="p-1.5 rounded-full bg-surface-muted text-text-secondary">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setAnchor(new Date())} className="text-sm font-medium text-text-primary">
            {headerLabel}
          </button>
          <button onClick={() => shift(1)} className="p-1.5 rounded-full bg-surface-muted text-text-secondary">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-3 py-3 pb-24">
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          {view === 'day' ? (
            <DayView date={dateISO} appointments={appointments} onOpen={openAppt} onEmptyTap={emptyTap} />
          ) : (
            <WeekView days={days} appointments={appointments} onOpen={openAppt} onEmptyTap={emptyTap} />
          )}
          <DragOverlay dropAnimation={null}>
            {activeAppt ? (
              <div className="bg-accent-light border-l-4 border-accent rounded-r-lg px-2 py-1 shadow-elevated">
                <p className="text-[11px] font-semibold text-accent-dark">{activeAppt.patients?.name || 'Patient'}</p>
                <p className="text-[10px] text-text-secondary">{label12(activeAppt.appointment_time)}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <p className="text-center text-[11px] text-text-disabled mt-3">
          Drag an appointment to reschedule · tap to edit
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── Form (create / edit) ───────────────────────── */

function ScheduleForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const { patientId, patientName, appointmentId } = router.query as {
    patientId: string; patientName: string; appointmentId?: string;
  };

  const isEdit = !!appointmentId;
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState(toISODateLocal(today));
  const [selectedTime, setSelectedTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState<string>('');
  const [showToothChart, setShowToothChart] = useState(false);

  useEffect(() => {
    if (isEdit && appointmentId && !dataLoaded) {
      appointmentsApi.list().then((r) => {
        const appt = r.data.appointments?.find((a: any) => a.id === appointmentId);
        if (appt) {
          setSelectedDate(appt.appointment_date);
          setSelectedTime(appt.appointment_time.slice(0, 5));
          setPurpose(appt.purpose || '');
          setSelectedTooth(appt.tooth_number || '');
          setDataLoaded(true);
        }
      }).catch(() => setDataLoaded(true));
    }
  }, [isEdit, appointmentId, dataLoaded]);

  const { data: toothHistoryData } = useQuery<ToothHistoryResponse>({
    queryKey: ['toothHistory', patientId],
    queryFn: () => patientsApi.toothHistory(patientId).then((r) => r.data),
    enabled: !!patientId && showToothChart,
  });

  const { data: slotsData } = useQuery<{ bookedSlots: string[] }>({
    queryKey: ['bookedSlots', selectedDate],
    queryFn: () => appointmentsApi.bookedSlots(selectedDate).then((r) => r.data),
  });
  const bookedSlots = slotsData?.bookedSlots ?? [];

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) { setError('Please select a date and time'); return; }
    setLoading(true);
    setError('');
    try {
      if (isEdit && appointmentId) {
        await appointmentsApi.update(appointmentId, {
          appointment_date: selectedDate,
          appointment_time: selectedTime + ':00',
          purpose: purpose || null,
          tooth_number: selectedTooth || null,
        });
      } else {
        await appointmentsApi.create({
          patientId,
          appointmentDate: selectedDate,
          appointmentTime: selectedTime + ':00',
          purpose: purpose || null,
          toothNumber: selectedTooth || null,
        });
      }
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['patient', patientId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const dates = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return toISODateLocal(d);
  });

  return (
    <div className="min-h-screen bg-bg">
      <div className="bg-surface border-b border-border px-5 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-text-primary">
            {isEdit ? 'Edit Appointment' : 'Schedule Appointment'}
          </h1>
        </div>
      </div>

      <div className="px-5 py-5 pb-36 space-y-6">
        {patientName && (
          <div className="flex items-center gap-3 bg-accent-light border border-accent/30 rounded-full px-4 py-2">
            <PatientAvatar name={patientName} size="sm" />
            <span className="text-sm font-medium text-accent flex-1">{patientName}</span>
          </div>
        )}

        <div>
          <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase mb-3">Select Date</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dates.map((d) => {
              const dt = new Date(d + 'T00:00:00');
              const isToday = d === toISODateLocal(today);
              const isSelected = d === selectedDate;
              return (
                <button
                  key={d}
                  onClick={() => { setSelectedDate(d); setSelectedTime(''); }}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-lg border transition-colors ${
                    isSelected ? 'bg-accent text-white border-accent' :
                    isToday ? 'bg-accent-light border-accent text-accent' :
                    'bg-surface border-border text-text-primary'
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase">{dt.toLocaleDateString('en', { weekday: 'short' })}</span>
                  <span className="text-lg font-bold leading-none">{dt.getDate()}</span>
                  {isToday && !isSelected && <span className="text-[8px] font-semibold text-accent">Today</span>}
                </button>
              );
            })}
          </div>
          {selectedDate && (
            <p className="text-xs text-text-secondary mt-2">
              Selected: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </p>
          )}
        </div>

        <div>
          <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase mb-3">Select Time</p>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map((slot) => {
              const isBooked = bookedSlots.some((b) => b.startsWith(slot)) && slot !== selectedTime;
              const isSelected = selectedTime === slot;
              return (
                <button
                  key={slot}
                  disabled={isBooked}
                  onClick={() => setSelectedTime(slot)}
                  className={`h-9 px-3.5 rounded-full text-sm font-medium transition-colors ${
                    isBooked
                      ? 'bg-surface-muted text-text-disabled line-through cursor-not-allowed border border-border'
                      : isSelected
                        ? 'bg-accent text-white shadow-primary-sm'
                        : 'bg-surface-muted border border-border text-text-secondary hover:border-accent hover:text-accent'
                  }`}
                >
                  {formatTime(slot)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase mb-3">Purpose</p>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={2}
            placeholder="e.g. Follow-up root canal, Scaling, Crown fitting"
            className="w-full bg-surface border-[1.5px] border-border rounded-md px-4 py-3 text-base text-text-primary placeholder:text-text-disabled focus:border-accent focus:bg-accent-subtle transition-colors resize-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase">Tooth (Optional)</p>
            {selectedTooth && (
              <button onClick={() => setSelectedTooth('')} className="flex items-center gap-1 text-xs text-error">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {selectedTooth && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-2 bg-accent-light border border-accent/30 rounded-full px-3 py-1.5">
                <span className="text-sm font-semibold text-accent">Tooth {selectedTooth}</span>
                <button onClick={() => setSelectedTooth('')}>
                  <X className="w-3.5 h-3.5 text-accent/60" />
                </button>
              </div>
            </div>
          )}

          <button onClick={() => setShowToothChart((s) => !s)} className="text-sm font-medium text-accent underline">
            {showToothChart ? 'Hide tooth chart' : 'Select from tooth chart'}
          </button>

          {showToothChart && (
            <div className="mt-3 bg-surface border border-border rounded-xl p-4">
              <p className="text-xs text-text-secondary mb-3 text-center">Tap a tooth to select</p>
              <ToothChart
                toothData={toothHistoryData?.toothMap ?? []}
                onToothClick={(tn) => { setSelectedTooth(tn); setShowToothChart(false); }}
                highlightedTooth={selectedTooth}
                compact
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-error">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface border-t border-border px-5 py-4 pb-6">
        <AppButton onClick={handleConfirm} isLoading={loading}>
          {isEdit ? 'Save Changes' : 'Confirm Appointment'}
        </AppButton>
      </div>
    </div>
  );
}
