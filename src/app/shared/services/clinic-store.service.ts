import { Injectable, computed, effect, signal } from '@angular/core';
import { addDays, addMinutes, minutes, nowHHmm, to12h, todayISO } from '../utils/time';
import {
  AdminProfile, AppointmentRecord, AppointmentStatus, ClinicDb, Doctor, NotificationAction, Patient,
  PatientNotification, ScheduleBlock, Slot
} from './clinic.models';
import { buildSeed } from './clinic.seed';

const STORAGE_KEY = 'clinicflow.db.v1';

export type Result = { ok: true; id?: string } | { ok: false; error: string };

/** Appointment joined with its doctor and patient, ready for display. */
export interface AppointmentView extends AppointmentRecord {
  doctor: string;
  specialty: string;
  location: string;
  patient: string;
  start: string;   // "09:00 AM"
  end: string;     // "09:30 AM"
}

/**
 * Single source of truth for the whole app (admin + patient portals).
 * Mock backend: state lives in signals and is saved to localStorage, so an admin's
 * approval is visible to the patient after they log in. Swap these methods for HTTP calls later.
 */
@Injectable({ providedIn: 'root' })
export class ClinicStore {
  private readonly db = signal<ClinicDb>(this.load());

  readonly admin = computed(() => this.db().admin);
  readonly doctors = computed(() => this.db().doctors);
  readonly activeDoctors = computed(() => this.db().doctors.filter(d => d.status === 'Active'));
  readonly patients = computed(() => this.db().patients);
  readonly schedules = computed(() => this.db().schedules);
  readonly notifications = computed(() => this.db().notifications);
  readonly specialties = computed(() => [...new Set(this.db().doctors.map(d => d.specialty))].sort());

  /** All appointments joined with doctor/patient names, soonest first. */
  readonly appointments = computed<AppointmentView[]>(() => {
    const { doctors, patients, appointments } = this.db();
    const doc = new Map(doctors.map(d => [d.id, d]));
    const pat = new Map(patients.map(p => [p.id, p]));
    return appointments
      .map(a => {
        const d = doc.get(a.doctorId);
        return {
          ...a,
          doctor: d?.name ?? 'Unknown doctor',
          specialty: d?.specialty ?? '',
          location: `ClinicFlow · ${d?.location ?? ''}`,
          patient: pat.get(a.patientId)?.fullName ?? 'Unknown patient',
          start: to12h(a.time),
          end: to12h(addMinutes(a.time, a.duration))
        };
      })
      .sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  });

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db()));
      } catch {
        // Storage full or blocked: keep working in memory.
      }
    });
  }

  // ---------- Lookups ----------

  doctor(id: string): Doctor | undefined {
    return this.db().doctors.find(d => d.id === id);
  }

  patient(id: string): Patient | undefined {
    return this.db().patients.find(p => p.id === id);
  }

  patientByEmail(email: string): Patient | undefined {
    const e = email.trim().toLowerCase();
    return this.db().patients.find(p => p.email.toLowerCase() === e);
  }

  // ---------- Availability ----------

  /** Bookable slots for a doctor on a date; booked or past slots are marked unavailable. */
  slotsFor(doctorId: string, date: string, ignoreAppointmentId?: string): Slot[] {
    const doctor = this.doctor(doctorId);
    const { schedules, appointments } = this.db();
    const taken = new Set(
      appointments
        .filter(a => a.doctorId === doctorId && a.date === date && a.id !== ignoreAppointmentId &&
          (a.status === 'Pending' || a.status === 'Approved'))
        .map(a => a.time)
    );
    const today = todayISO();
    const now = nowHHmm();
    const slots: Slot[] = [];
    for (const b of schedules.filter(s => s.doctorId === doctorId && s.date === date).sort((x, y) => x.start.localeCompare(y.start))) {
      for (let t = minutes(b.start); t + b.slotMinutes <= minutes(b.end); t += b.slotMinutes) {
        const time = addMinutes('00:00', t);
        const booked = taken.has(time);
        const past = date < today || (date === today && time <= now);
        slots.push({
          time, end: addMinutes(time, b.slotMinutes), label: to12h(time), booked,
          available: !booked && !past && doctor?.status === 'Active'
        });
      }
    }
    return slots;
  }

  /** Upcoming dates (from today) on which the doctor has at least one free slot. */
  availableDates(doctorId: string, limit = 10, horizonDays = 60): string[] {
    const dates = [...new Set(this.db().schedules.filter(s => s.doctorId === doctorId).map(s => s.date))]
      .filter(d => d >= todayISO() && d <= addDays(todayISO(), horizonDays))
      .sort();
    const result: string[] = [];
    for (const d of dates) {
      if (this.slotsFor(doctorId, d).some(s => s.available)) result.push(d);
      if (result.length >= limit) break;
    }
    return result;
  }

  nextAvailable(doctorId: string): { date: string; slot: Slot } | null {
    const date = this.availableDates(doctorId, 1)[0];
    if (!date) return null;
    const slot = this.slotsFor(doctorId, date).find(s => s.available)!;
    return { date, slot };
  }

  // ---------- Appointments ----------

  /** Patient booking request (status Pending). */
  requestAppointment(input: {
    patientId: string; doctorId: string; date: string; time: string; type: string;
    reason: string; notes?: string; firstVisit: boolean;
  }): Result {
    return this.createAppointment(input, 'Pending');
  }

  /** Staff booking on behalf of a patient (status Approved). */
  bookForPatient(input: {
    patientId: string; doctorId: string; date: string; time: string; type: string;
    reason: string; notes?: string; firstVisit: boolean;
  }): Result {
    return this.createAppointment(input, 'Approved');
  }

  approve(id: string, note?: string): Result {
    return this.transition(id, ['Pending'], 'Approved', 'Approved by clinic', a => ({
      clinicNote: note?.trim() || 'Please arrive 15 minutes before your appointment and bring a valid ID and your current medication list.'
    }), a => this.notice(a, 'APPROVAL', 'Your appointment is approved', 'Your visit is confirmed. Please arrive 15 minutes early.',
      { kind: 'view-appointment', appointmentId: a.id }));
  }

  reject(id: string, reason: string): Result {
    if (!reason.trim()) return { ok: false, error: 'Please give a reason so the patient knows what to do next.' };
    return this.transition(id, ['Pending'], 'Rejected', 'Rejected by clinic', () => ({ clinicNote: reason.trim() }),
      a => this.notice(a, 'REJECTION', 'Your appointment request was not approved', reason.trim(), { kind: 'book', doctorId: a.doctorId }));
  }

  cancel(id: string, by: 'patient' | 'clinic', reason = ''): Result {
    const note = `Cancelled by ${by}${reason.trim() ? ': ' + reason.trim() : '.'}`;
    return this.transition(id, ['Pending', 'Approved'], 'Cancelled', `Cancelled by ${by}`, () => ({ clinicNote: note }),
      a => this.notice(a, 'CANCELLATION', 'Your appointment was cancelled',
        by === 'patient' ? 'Cancelled at your request. You can book a new visit anytime.' : note,
        { kind: 'book', doctorId: a.doctorId }));
  }

  complete(id: string, visitSummary: string): Result {
    return this.transition(id, ['Approved'], 'Completed', 'Visit completed', () => ({ visitSummary: visitSummary.trim() || undefined, clinicNote: undefined }),
      a => this.notice(a, 'COMPLETED', 'Your visit is complete', visitSummary.trim() ? "Your doctor's notes are now available." : 'Thank you for visiting ClinicFlow.',
        { kind: 'view-appointment', appointmentId: a.id }));
  }

  // ---------- Patients ----------

  registerPatient(input: { fullName: string; email: string; password: string; phone?: string; dob?: string; gender?: string; address?: string }): Result {
    if (this.patientByEmail(input.email)) return { ok: false, error: 'An account with this email already exists.' };
    if (input.email.trim().toLowerCase() === this.admin().email.toLowerCase()) return { ok: false, error: 'This email is not available.' };
    const ids = this.db().patients.map(p => Number(p.id.replace('CF-', ''))).filter(n => !isNaN(n));
    const id = `CF-${Math.max(1000, ...ids) + 1}`;
    const patient: Patient = {
      id, fullName: input.fullName.trim(), email: input.email.trim().toLowerCase(), password: input.password,
      phone: input.phone?.trim() ?? '', dob: input.dob ?? '', gender: input.gender ?? '', address: input.address?.trim() ?? '',
      registeredOn: todayISO(), status: 'Active', emailUpdates: true
    };
    this.update(db => ({ ...db, patients: [...db.patients, patient] }));
    return { ok: true, id };
  }

  updatePatient(id: string, changes: Partial<Omit<Patient, 'id' | 'password'>>): Result {
    if (changes.email) {
      const other = this.patientByEmail(changes.email);
      if (other && other.id !== id) return { ok: false, error: 'Another account already uses this email.' };
      changes = { ...changes, email: changes.email.trim().toLowerCase() };
    }
    this.update(db => ({ ...db, patients: db.patients.map(p => p.id === id ? { ...p, ...changes } : p) }));
    return { ok: true };
  }

  // ---------- Doctors ----------

  saveDoctor(doctor: Omit<Doctor, 'id'> & { id?: string }): Result {
    if (!doctor.name.trim() || !doctor.specialty.trim()) return { ok: false, error: 'Name and specialty are required.' };
    if (doctor.id) {
      this.update(db => ({ ...db, doctors: db.doctors.map(d => d.id === doctor.id ? { ...d, ...doctor } as Doctor : d) }));
      return { ok: true, id: doctor.id };
    }
    const base = doctor.name.toLowerCase().replace(/^dr\.?\s*/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'doctor';
    let id = base;
    for (let i = 2; this.doctor(id); i++) id = `${base}-${i}`;
    this.update(db => ({ ...db, doctors: [...db.doctors, { ...doctor, id } as Doctor] }));
    return { ok: true, id };
  }

  // ---------- Schedules ----------

  /** Adds availability on `date` (and the same weekday for `repeatWeeks` more weeks). Skips overlapping days. */
  addAvailability(input: { doctorId: string; date: string; start: string; end: string; slotMinutes: number; repeatWeeks: number }): Result & { created?: number; skipped?: number } {
    if (minutes(input.end) - minutes(input.start) < input.slotMinutes) return { ok: false, error: 'End time must be at least one slot after the start time.' };
    if (input.date < todayISO()) return { ok: false, error: 'Choose today or a future date.' };
    const blocks: ScheduleBlock[] = [];
    let skipped = 0;
    let seq = this.db().seq;
    for (let w = 0; w <= input.repeatWeeks; w++) {
      const date = addDays(input.date, w * 7);
      const overlaps = this.db().schedules.some(s => s.doctorId === input.doctorId && s.date === date &&
        minutes(s.start) < minutes(input.end) && minutes(input.start) < minutes(s.end));
      if (overlaps) { skipped++; continue; }
      blocks.push({ id: `SB-N${++seq}`, doctorId: input.doctorId, date, start: input.start, end: input.end, slotMinutes: input.slotMinutes });
    }
    if (!blocks.length) return { ok: false, error: 'These hours overlap existing availability.' };
    this.update(db => ({ ...db, seq, schedules: [...db.schedules, ...blocks] }));
    return { ok: true, created: blocks.length, skipped };
  }

  /** Removes a block; refuses if it has booked (pending/approved) appointments. */
  removeAvailability(blockId: string): Result {
    const block = this.db().schedules.find(s => s.id === blockId);
    if (!block) return { ok: false, error: 'Block not found.' };
    const booked = this.slotsFor(block.doctorId, block.date).filter(s => s.booked && minutes(s.time) >= minutes(block.start) && minutes(s.time) < minutes(block.end));
    if (booked.length) return { ok: false, error: `This block has ${booked.length} booked appointment(s). Cancel or move them first.` };
    this.update(db => ({ ...db, schedules: db.schedules.filter(s => s.id !== blockId) }));
    return { ok: true };
  }

  // ---------- Notifications ----------

  markRead(id: string): void {
    this.update(db => ({ ...db, notifications: db.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
  }

  markAllRead(patientId: string): void {
    this.update(db => ({ ...db, notifications: db.notifications.map(n => n.patientId === patientId ? { ...n, read: true } : n) }));
  }

  // ---------- Admin ----------

  updateAdmin(changes: Partial<AdminProfile>): void {
    this.update(db => ({ ...db, admin: { ...db.admin, ...changes } }));
  }

  changeAdminPassword(current: string, next: string): Result {
    if (current !== this.admin().password) return { ok: false, error: 'Current password is incorrect.' };
    if (next.length < 8) return { ok: false, error: 'New password must be at least 8 characters.' };
    this.updateAdmin({ password: next, passwordUpdatedOn: todayISO() });
    return { ok: true };
  }

  /** Restores the demo data (useful while testing). */
  resetDemoData(): void {
    this.db.set(buildSeed());
  }

  // ---------- Internals ----------

  private createAppointment(input: {
    patientId: string; doctorId: string; date: string; time: string; type: string;
    reason: string; notes?: string; firstVisit: boolean;
  }, status: 'Pending' | 'Approved'): Result {
    const patient = this.patient(input.patientId);
    if (!patient || patient.status !== 'Active') return { ok: false, error: 'This patient account is not active.' };
    const slot = this.slotsFor(input.doctorId, input.date).find(s => s.time === input.time);
    if (!slot) return { ok: false, error: 'This time is not part of the doctor’s schedule.' };
    if (!slot.available) return { ok: false, error: 'This time is no longer available. Please choose another time.' };

    const now = new Date().toISOString();
    const seq = this.db().seq + 1;
    const record: AppointmentRecord = {
      id: `APT-${seq}`, patientId: input.patientId, doctorId: input.doctorId, date: input.date, time: input.time,
      duration: minutes(slot.end) - minutes(slot.time), type: input.type, reason: input.reason.trim(),
      notes: input.notes?.trim() || undefined, firstVisit: input.firstVisit, status, requestedOn: now,
      clinicNote: status === 'Pending'
        ? 'Your request is awaiting clinic review. You will be notified once it is approved.'
        : 'Please arrive 15 minutes before your appointment and bring a valid ID and your current medication list.',
      history: status === 'Pending'
        ? [{ label: 'Request sent', date: now }]
        : [{ label: 'Booked by clinic', date: now }]
    };
    this.update(db => ({ ...db, seq, appointments: [...db.appointments, record] }));
    this.notice(record, status === 'Pending' ? 'REQUEST' : 'APPROVAL',
      status === 'Pending' ? 'Appointment request sent' : 'An appointment was booked for you',
      status === 'Pending' ? 'The clinic will review your request shortly.' : 'Your visit is confirmed. Please arrive 15 minutes early.',
      { kind: 'view-appointment', appointmentId: record.id });
    return { ok: true, id: record.id };
  }

  private transition(
    id: string, from: AppointmentStatus[], to: AppointmentStatus, label: string,
    changes: (a: AppointmentRecord) => Partial<AppointmentRecord>,
    after: (a: AppointmentRecord) => void
  ): Result {
    const current = this.db().appointments.find(a => a.id === id);
    if (!current) return { ok: false, error: 'Appointment not found.' };
    if (!from.includes(current.status)) return { ok: false, error: `A ${current.status.toLowerCase()} appointment can’t be ${to.toLowerCase()}.` };
    const updated: AppointmentRecord = {
      ...current, ...changes(current), status: to,
      history: [...current.history, { label, date: new Date().toISOString() }]
    };
    this.update(db => ({ ...db, appointments: db.appointments.map(a => a.id === id ? updated : a) }));
    after(updated);
    return { ok: true, id };
  }

  private notice(a: AppointmentRecord, type: string, title: string, message: string, action: NotificationAction): void {
    const doctor = this.doctor(a.doctorId);
    const n: PatientNotification = {
      id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      patientId: a.patientId, type, title, message, action, read: false,
      subtitle: `${doctor?.name ?? ''} · ${a.date} · ${to12h(a.time)}`,
      createdAt: new Date().toISOString()
    };
    this.update(db => ({ ...db, notifications: [n, ...db.notifications] }));
  }

  private update(fn: (db: ClinicDb) => ClinicDb): void {
    this.db.update(fn);
  }

  private load(): ClinicDb {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ClinicDb;
        if (parsed?.version === 1 && Array.isArray(parsed.appointments)) return parsed;
      }
    } catch {
      // Corrupt or unavailable storage: fall back to demo data.
    }
    return buildSeed();
  }
}
