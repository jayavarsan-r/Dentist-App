import type { Appointment } from '@/types';

// 08:00–20:00 in 30-minute steps
export const DAY_START = 8;
export const DAY_END = 20;

export function buildSlots(): string[] {
  const slots: string[] = [];
  for (let h = DAY_START; h < DAY_END; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

export const SLOTS = buildSlots();

// "HH:MM:SS" | "HH:MM" → "HH:MM"
export function hhmm(time: string): string {
  return (time || '').slice(0, 5);
}

export function label12(time: string): string {
  const [h, m] = hhmm(time).split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function toISODateLocal(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

// Snap an arbitrary HH:MM to the nearest 30-min slot within range
export function snapToSlot(time: string): string {
  const [h, m] = hhmm(time).split(':').map(Number);
  let mins = h * 60 + m;
  mins = Math.round(mins / 30) * 30;
  const min = DAY_START * 60;
  const max = (DAY_END - 1) * 60 + 30;
  mins = Math.max(min, Math.min(max, mins));
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = (day + 6) % 7; // make Monday the first day
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function apptsFor(appointments: Appointment[], date: string): Appointment[] {
  return appointments
    .filter((a) => a.appointment_date === date && a.status !== 'cancelled')
    .sort((a, b) => hhmm(a.appointment_time).localeCompare(hhmm(b.appointment_time)));
}
