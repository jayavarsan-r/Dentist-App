export interface Dentist {
  id: string;
  name: string | null;
  clinic_name: string | null;
  phone: string;
  address: string | null;
  working_hours: { start: string; end: string };
  created_at: string;
}

export interface Patient {
  id: string;
  dentist_id: string;
  name: string;
  phone: string;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  medical_conditions: string | null;
  allergies: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  visits?: Visit[];
  appointments?: Appointment[];
}

export type VisitStatus = 'completed' | 'in_progress' | 'pending' | 'cancelled';

export interface Visit {
  id: string;
  patient_id: string;
  dentist_id: string;
  visit_date: string;
  procedure_name: string;
  tooth_number: string | null;
  status: VisitStatus;
  raw_transcript: string | null;
  notes: string | null;
  medications: string | null;
  next_steps: string | null;
  follow_up_date: string | null;
  follow_up_done: boolean;
  created_at: string;
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled' | 'rescheduled';

export interface Appointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  appointment_date: string;
  appointment_time: string;
  purpose: string | null;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  patients?: Pick<Patient, 'id' | 'name' | 'phone'>;
}

export interface DashboardStats {
  totalAppointmentsToday: number;
  upcomingToday: number;
  completedToday: number;
  pendingFollowUps: number;
  followups: (Visit & { patients: Pick<Patient, 'id' | 'name' | 'phone'> })[];
}

export interface StructuredNote {
  procedure: string;
  toothNumber: string | null;
  status: VisitStatus;
  notes: string;
  medications: string | null;
  nextSteps: string | null;
  followUpDays: number | null;
  followUpDate: string | null;
}
