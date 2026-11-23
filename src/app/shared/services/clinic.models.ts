export type AppointmentStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed';
export const APPOINTMENT_STATUSES: AppointmentStatus[] = ['Pending', 'Approved', 'Completed', 'Rejected', 'Cancelled'];

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  title: string;
  email: string;
  phone: string;
  experienceYears: number;
  languages: string;
  location: string;
  bio: string;
  status: 'Active' | 'On leave';
}

export interface Patient {
  id: string;            // e.g. "CF-1024"
  fullName: string;
  email: string;
  phone: string;
  dob: string;           // ISO date
  gender: string;
  address: string;
  registeredOn: string;  // ISO date
  status: 'Active' | 'Inactive';
  password: string;      // mock only — real passwords belong on the backend, hashed
  emailUpdates: boolean;
}

export interface StatusEvent {
  label: string;
  date: string;          // ISO date-time
}

export interface AppointmentRecord {
  id: string;            // e.g. "APT-1001"
  patientId: string;
  doctorId: string;
  date: string;          // ISO date
  time: string;          // "HH:mm"
  duration: number;      // minutes
  type: string;
  reason: string;
  notes?: string;
  firstVisit: boolean;
  status: AppointmentStatus;
  requestedOn: string;   // ISO date-time
  clinicNote?: string;   // instructions / rejection / cancellation reason
  visitSummary?: string; // doctor's notes after the visit
  history: StatusEvent[];
}

/** A doctor's bookable availability on one date, split into equal slots. */
export interface ScheduleBlock {
  id: string;
  doctorId: string;
  date: string;          // ISO date
  start: string;         // "HH:mm"
  end: string;           // "HH:mm"
  slotMinutes: number;
}

export type NotificationAction =
  | { kind: 'view-appointment'; appointmentId: string }
  | { kind: 'view-doctor'; doctorId: string }
  | { kind: 'book'; doctorId: string | null };

export interface PatientNotification {
  id: string;
  patientId: string;
  type: string;          // APPROVAL, REJECTION, CANCELLATION, REQUEST, COMPLETED, SCHEDULE UPDATE
  title: string;
  subtitle: string;
  message: string;
  createdAt: string;     // ISO date-time
  read: boolean;
  action: NotificationAction;
}

export interface AdminProfile {
  fullName: string;
  email: string;
  phone: string;
  password: string;      // mock only
  clinicName: string;
  passwordUpdatedOn: string;
}

export interface Slot {
  time: string;          // "HH:mm"
  end: string;           // "HH:mm"
  label: string;         // "09:00 AM"
  available: boolean;
  booked: boolean;
}

export interface ClinicDb {
  version: number;
  seq: number;
  admin: AdminProfile;
  doctors: Doctor[];
  patients: Patient[];
  appointments: AppointmentRecord[];
  schedules: ScheduleBlock[];
  notifications: PatientNotification[];
}

export const APPOINTMENT_TYPES = [
  'General consultation',
  'Follow-up visit',
  'Specialist consultation',
  'Routine check-up'
];

export const CLINIC_ADDRESS = 'ClinicFlow Medical Center · 120 Wellness Avenue';
