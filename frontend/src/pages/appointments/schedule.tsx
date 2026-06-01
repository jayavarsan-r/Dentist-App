import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { ArrowLeft, X } from 'lucide-react';
import AppButton from '@/components/shared/AppButton';
import PatientAvatar from '@/components/shared/PatientAvatar';
import ToothChart from '@/components/shared/ToothChart';
import { appointmentsApi, patientsApi } from '@/lib/api';
import { formatTime, TIME_SLOTS } from '@/lib/constants';
import type { ToothHistoryResponse } from '@/types';

function toISODateLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function SchedulePage() {
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

  // If editing, load existing appointment data
  useEffect(() => {
    if (isEdit && appointmentId && !dataLoaded) {
      appointmentsApi.list().then((r) => {
        const appt = r.data.appointments?.find((a: any) => a.id === appointmentId);
        if (appt) {
          setSelectedDate(appt.appointment_date);
          setSelectedTime(appt.appointment_time.slice(0, 5)); // "HH:MM"
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

  // Generate next 30 days for date picker
  const dates = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return toISODateLocal(d);
  });

  return (
    <div className="min-h-screen bg-app-bg">
      {/* AppBar */}
      <div className="bg-app-surface border-b border-app-border px-5 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-text-primary">
            {isEdit ? 'Edit Appointment' : 'Schedule Appointment'}
          </h1>
        </div>
      </div>

      <div className="px-5 py-5 pb-36 space-y-6">
        {/* Patient chip */}
        {patientName && (
          <div className="flex items-center gap-3 bg-primary-surface border border-primary/30 rounded-full px-4 py-2">
            <PatientAvatar name={patientName} size="sm" />
            <span className="text-sm font-medium text-primary flex-1">{patientName}</span>
          </div>
        )}

        {/* Date selection */}
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
                    isSelected ? 'bg-primary text-white border-primary' :
                    isToday ? 'bg-primary-surface border-primary text-primary' :
                    'bg-app-surface border-app-border text-text-primary'
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase">
                    {dt.toLocaleDateString('en', { weekday: 'short' })}
                  </span>
                  <span className="text-lg font-bold leading-none">{dt.getDate()}</span>
                  {isToday && !isSelected && (
                    <span className="text-[8px] font-semibold text-primary">Today</span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Show full date */}
          {selectedDate && (
            <p className="text-xs text-text-secondary mt-2">
              Selected: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </p>
          )}
        </div>

        {/* Time slots */}
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
                      ? 'bg-app-surface-variant text-text-disabled line-through cursor-not-allowed border border-app-border'
                      : isSelected
                        ? 'bg-primary text-white shadow-primary-sm'
                        : 'bg-app-surface-variant border border-app-border text-text-secondary hover:border-primary hover:text-primary'
                  }`}
                >
                  {formatTime(slot)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Purpose */}
        <div>
          <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase mb-3">Purpose</p>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={2}
            placeholder="e.g. Follow-up root canal, Scaling, Crown fitting"
            className="w-full bg-app-surface border-[1.5px] border-app-border rounded-md px-4 py-3 text-base text-text-primary placeholder:text-text-disabled focus:border-primary focus:bg-primary-subtle transition-colors resize-none"
          />
        </div>

        {/* Tooth selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-text-secondary tracking-widest uppercase">Tooth (Optional)</p>
            {selectedTooth && (
              <button
                onClick={() => setSelectedTooth('')}
                className="flex items-center gap-1 text-xs text-error"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Selected tooth chip */}
          {selectedTooth && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-2 bg-primary-surface border border-primary/30 rounded-full px-3 py-1.5">
                <span className="text-sm font-semibold text-primary">Tooth {selectedTooth}</span>
                <button onClick={() => setSelectedTooth('')}>
                  <X className="w-3.5 h-3.5 text-primary/60" />
                </button>
              </div>
            </div>
          )}

          {/* Toggle chart button */}
          <button
            onClick={() => setShowToothChart((s) => !s)}
            className="text-sm font-medium text-primary underline"
          >
            {showToothChart ? 'Hide tooth chart' : 'Select from tooth chart'}
          </button>

          {/* Compact tooth chart */}
          {showToothChart && (
            <div className="mt-3 bg-app-surface border border-app-border rounded-xl p-4">
              <p className="text-xs text-text-secondary mb-3 text-center">Tap a tooth to select</p>
              <ToothChart
                toothData={toothHistoryData?.toothMap ?? []}
                onToothClick={(tn) => {
                  setSelectedTooth(tn);
                  setShowToothChart(false);
                }}
                highlightedTooth={selectedTooth}
                compact
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-error">{error}</p>}
      </div>

      {/* Sticky bottom */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-app-surface border-t border-app-border px-5 py-4 pb-6">
        <AppButton onClick={handleConfirm} isLoading={loading}>
          {isEdit ? 'Save Changes' : 'Confirm Appointment'}
        </AppButton>
      </div>
    </div>
  );
}
