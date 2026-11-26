export type AppointmentStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Completed' | 'No-show' | 'Expired';
export const APPOINTMENT_STATUSES: AppointmentStatus[] =
  ['Pending', 'Approved', 'Completed', 'No-show', 'Rejected', 'Cancelled', 'Expired'];

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

/** Appointment with its doctor and patient names, as returned by the API. */
export interface AppointmentView extends AppointmentRecord {
  doctor: string;
  specialty: string;
  location: string;
  patient: string;
  start: string;         // "09:00 AM"
  end: string;           // "09:30 AM"
}

/** A doctor's bookable availability on one date, split into equal slots. */
export interface ScheduleBlock {
  id: number;
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

/** Schedule blocks plus the times already taken (without patient details). */
export interface Availability {
  blocks: ScheduleBlock[];
  busy: { doctorId: string; date: string; time: string }[];
}

/** Public clinic contact details. */
export interface ClinicInfo {
  name: string;
  phone: string;
}

export type PatientInput = Pick<Patient, 'fullName' | 'email' | 'phone' | 'dob' | 'gender' | 'address'>;

export interface BookingInput {
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: string;
  reason: string;
  notes?: string;
  firstVisit: boolean;
}

export const DOCTOR_SPECIALTIES = [
  'Cardiology',
  'Dentistry',
  'Dermatology',
  'ENT',
  'General medicine',
  'Neurology',
  'Obstetrics and gynecology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry'
];

export const APPOINTMENT_TYPES = [
  'General consultation',
  'Follow-up visit',
  'Specialist consultation',
  'Routine check-up'
];
