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
  clinical_flags?: ClinicalFlags | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  visits?: Visit[];
  appointments?: Appointment[];
}

export interface ClinicalFlags {
  bloodThinner?: boolean;
  diabetes?: boolean;
  heartCondition?: boolean;
  pregnancy?: boolean;
  notes?: string;
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
  cost?: number | null;
  currency?: string;
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
  tooth_number?: string | null;
}

export interface DashboardStats {
  totalAppointmentsToday: number;
  upcomingToday: number;
  completedToday: number;
  pendingFollowUps: number;
  followups: (Visit & { patients: Pick<Patient, 'id' | 'name' | 'phone'> })[];
  recentAppointments?: (Appointment & { patients: Pick<Patient, 'id' | 'name' | 'phone'> })[];
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
  cost?: number | null;
  currency?: string;
  totalSittings?: number | null;
  remainingSittings?: number | null;
  isMultiSitting?: boolean;
  treatmentPlanSuggested?: boolean;
  assignedDoctor?: string | null;
}

// ─── V3 TYPES ───

export interface Clinic {
  id: string;
  name: string;
  city: string | null;
  display_id: string;
  join_code: string;
  owner_staff_id: string | null;
  created_at: string;
}

export type StaffRole = 'doctor' | 'receptionist';
export type StaffStatus = 'pending' | 'active' | 'disabled';

export interface StaffMember {
  id: string;
  clinic_id: string;
  dentist_id: string | null;
  phone: string;
  name: string | null;
  role: StaffRole;
  status: StaffStatus;
  created_at: string;
}

export type QueueStatus = 'waiting' | 'in_consultation' | 'completed' | 'skipped' | 'ready_for_checkout' | 'checked_out';
export type ConsultationOutcome =
  | 'diagnosis_only'
  | 'treatment_done'
  | 'treatment_postponed'
  | 'patient_declined'
  | 'referred'
  | 'follow_up_scheduled'
  | 'additional_sitting_required';

export interface OutcomeMetadata {
  follow_up_days?: number;
  remaining_sittings?: number;
  referred_to_doctor_id?: string;
  referred_to_doctor_name?: string;
  suggested_return_date?: string;
}

export interface QueueEntry {
  id: string;
  clinic_id: string;
  patient_id: string;
  treatment_plan_id: string | null;
  added_by: string | null;
  assigned_doctor: string | null;
  status: QueueStatus;
  consultation_outcome: ConsultationOutcome | null;
  outcome_metadata: OutcomeMetadata | null;
  chief_complaint: string | null;
  visit_reason: string | null;
  priority: 'normal' | 'urgent';
  queue_date: string;
  token_number: number;
  sort_order: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patients?: Pick<Patient, 'id' | 'name' | 'phone' | 'age' | 'gender' | 'allergies'> & { clinical_flags?: any };
  treatment_plans?: { id: string; procedure_name: string; total_sittings: number; completed_sittings: number; pending_amount: number } | null;
  added_by_staff?: Pick<StaffMember, 'id' | 'name' | 'role'> | null;
  assigned_doctor_staff?: Pick<StaffMember, 'id' | 'name' | 'role'> | null;
}

export interface ReceptionTask {
  entry: QueueEntry;
  patient_name: string;
  doctor_name: string | null;
  outcome_label: string;
  amount_due: number;
  prescription_ready: boolean;
  needs_appointment: boolean;
}

export interface ConsultContext {
  queueEntry: QueueEntry;
  patient: Patient;
  activePlans: TreatmentPlan[];
  lastVisit: Visit | null;
  todayXrays: XRay[];
  pendingBalance: number;
}

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'other';

export interface Payment {
  id: string;
  clinic_id: string;
  patient_id: string;
  treatment_plan_id: string | null;
  queue_entry_id: string | null;
  received_by: string | null;
  amount: number;
  payment_method: PaymentMethod;
  notes: string | null;
  payment_date: string;
  created_at: string;
  received_by_staff?: Pick<StaffMember, 'name' | 'role'> | null;
  treatment_plans?: { procedure_name: string } | null;
}

// ─── V4 TYPES ───

export type TreatmentPlanStatus = 'active' | 'completed' | 'cancelled' | 'paused';

export interface TreatmentPlan {
  id: string;
  patient_id: string;
  dentist_id: string;
  diagnosis: string | null;
  procedure_name: string;
  total_sittings: number;
  completed_sittings: number;
  estimated_cost: number;
  collected_amount: number;
  pending_amount: number;
  status: TreatmentPlanStatus;
  notes: string | null;
  start_date: string | null;
  expected_end_date: string | null;
  created_at: string;
  updated_at: string;
  visits?: Pick<Visit, 'id' | 'visit_date' | 'status' | 'procedure_name' | 'cost'>[];
  appointments?: Pick<Appointment, 'id' | 'appointment_date' | 'appointment_time' | 'status' | 'purpose'>[];
}

export interface VisitNote {
  id: string;
  visit_id: string;
  patient_id: string;
  dentist_id: string;
  note_number: number;
  raw_transcript: string | null;
  structured_note: any | null;
  procedure_name: string | null;
  tooth_number: string | null;
  status: string;
  notes: string | null;
  medications: string | null;
  next_steps: string | null;
  follow_up_date: string | null;
  cost: number | null;
  audio_storage_path: string | null;
  audio_file_size_kb: number | null;
  created_at: string;
}

export interface PrescriptionMedicine {
  name: string;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  timing: string | null;
  instructions: string | null;
}

export interface Prescription {
  id: string;
  patient_id: string;
  dentist_id: string;
  visit_id: string | null;
  visit_note_id: string | null;
  raw_voice: string | null;
  medicines: PrescriptionMedicine[];
  instructions: string | null;
  pdf_storage_path: string | null;
  follow_up: string | null;
  created_at: string;
  patients?: { name: string; age: number | null; gender: string | null; phone: string };
  dentists?: { name: string | null; clinic_name: string | null; phone: string };
}

export interface XRay {
  id: string;
  patient_id: string;
  dentist_id: string;
  visit_id: string | null;
  xray_type: 'OPG' | 'RVG' | 'CBCT' | 'Photo' | 'Other';
  storage_path: string;
  file_size_kb: number | null;
  date_taken: string;
  tooth_number: string | null;
  notes: string | null;
  remarks: string | null;
  created_at: string;
}

export interface CaseSheet {
  patient: Patient;
  activeTreatmentPlans: TreatmentPlan[];
  allTreatmentPlans: TreatmentPlan[];
  visits: (Visit & { visit_notes?: VisitNote[] })[];
  prescriptions: Prescription[];
  xrays: XRay[];
  upcomingAppointments: Appointment[];
  summary: {
    totalVisits: number;
    totalBilled: number;
    totalPlannedCost: number;
    totalCollected: number;
    pendingAmount: number;
    totalXrays: number;
    totalPrescriptions: number;
  };
}

export interface ToothProcedure {
  visitId: string;
  date: string;
  procedure: string;
  status: string;
  notes: string | null;
  cost: number | null;
  followUpDate: string | null;
}

export interface ToothAppointment {
  appointmentId: string;
  date: string;
  time: string | null;
  purpose: string | null;
  status: string;
}

export interface ToothData {
  toothNumber: string;
  completedProcedures: ToothProcedure[];
  upcomingAppointments: ToothAppointment[];
  totalCost: number;
  lastProcedureDate: string | null;
  overallStatus: 'treated' | 'pending' | 'treated_pending';
}

export interface ToothHistoryResponse {
  patientId: string;
  toothMap: ToothData[];
  generalVisits: any[];
  totalBilled: number;
}
