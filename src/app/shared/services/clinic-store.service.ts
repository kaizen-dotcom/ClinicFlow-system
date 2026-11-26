import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { apiError } from '../utils/api-error';
import { ToastService } from './toast.service';
import { addDays, addMinutes, hasStarted, minutes, nowHHmm, to12h, todayISO } from '../utils/time';
import {
  AdminProfile, AppointmentRecord, AppointmentView, Availability, BookingInput, ClinicInfo, Doctor, Patient,
  PatientInput, PatientNotification, ScheduleBlock, Slot
} from './clinic.models';

export type { AppointmentView } from './clinic.models';

export type Result = { ok: true; id?: string } | { ok: false; error: string };

/** How often an open portal checks for changes made elsewhere (new requests, approvals…). */
const REFRESH_MS = 20_000;

/** Range of schedules loaded, in days around today (the API allows up to 370). */
const PAST_DAYS = 90;
const FUTURE_DAYS = 270;

const EMPTY_ADMIN: AdminProfile = { fullName: '', email: '', phone: '', clinicName: '', passwordUpdatedOn: '' };

interface Data {
  admin: AdminProfile;
  doctors: Doctor[];
  patients: Patient[];            // admin: everyone; patient: only their own record
  appointments: AppointmentView[];
  availability: Availability;
  notifications: PatientNotification[];
}

const EMPTY_DATA: Data = {
  admin: EMPTY_ADMIN, doctors: [], patients: [], appointments: [],
  availability: { blocks: [], busy: [] }, notifications: []
};

const slotKey = (doctorId: string, date: string, time: string) => `${doctorId}|${date}|${time}`;

/**
 * Single source of truth for the whole app (admin + patient portals).
 * Holds what the signed-in user may see, loaded from the API; every change is sent to the
 * server (which enforces the rules) and the data is then reloaded.
 */
@Injectable({ providedIn: 'root' })
export class ClinicStore {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private readonly data = signal<Data>(EMPTY_DATA);

  readonly admin = computed(() => this.data().admin);
  readonly doctors = computed(() => this.data().doctors);
  readonly activeDoctors = computed(() => this.data().doctors.filter(d => d.status === 'Active'));
  readonly patients = computed(() => this.data().patients);
  readonly schedules = computed(() => this.data().availability.blocks);
  readonly notifications = computed(() => this.data().notifications);
  readonly specialties = computed(() => [...new Set(this.data().doctors.map(d => d.specialty))].sort());
  /** All visible appointments, soonest first. */
  readonly appointments = computed(() => this.data().appointments);

  private readonly busy = computed(() =>
    new Set(this.data().availability.busy.map(b => slotKey(b.doctorId, b.date, b.time)))
  );

  /** Public clinic name and phone. */
  readonly clinicInfo = signal<ClinicInfo>({ name: '', phone: '' });

  /** Set when the latest load failed; cleared by the next successful one. */
  readonly loadError = signal('');

  private loadedFor: string | null = null;
  private latestRequest = 0;

  constructor() {
    const refreshIfOpen = () => {
      if (this.loadedFor && this.loadedFor === this.auth.userId() && this.auth.role && !document.hidden) void this.refresh();
    };
    const timer = setInterval(refreshIfOpen, REFRESH_MS);
    document.addEventListener('visibilitychange', refreshIfOpen);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfOpen);
    });
  }

  // ---------- Loading ----------

  /** Loads the signed-in user's data, dropping anything left over from another account. */
  async ensureLoaded(): Promise<void> {
    if (this.loadedFor !== this.auth.userId()) this.data.set(EMPTY_DATA);
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const role = this.auth.role;
    const userId = this.auth.userId();
    if (!role) return;
    const request = ++this.latestRequest;
    const today = todayISO();
    const range = { from: addDays(today, -PAST_DAYS), to: addDays(today, FUTURE_DAYS) };
    const get = <T>(url: string, params?: Record<string, string>) => firstValueFrom(this.http.get<T>(url, { params }));
    const isAdmin = role === 'admin';

    try {
      const [admin, doctors, patients, appointments, availability, notifications] = await Promise.all([
        isAdmin ? get<AdminProfile>('/api/admin/profile') : Promise.resolve(EMPTY_ADMIN),
        get<Doctor[]>('/api/doctors'),
        isAdmin ? get<Patient[]>('/api/patients') : get<Patient>('/api/patients/me').then(p => [p]),
        get<AppointmentView[]>('/api/appointments'),
        get<Availability>('/api/availability', range),
        isAdmin ? Promise.resolve([]) : get<PatientNotification[]>('/api/notifications'),
        this.loadClinicInfo()
      ]);
      // Ignore the answer if a newer load started or the user changed meanwhile.
      if (request !== this.latestRequest || userId !== this.auth.userId()) return;
      const next: Data = { admin, doctors, patients, appointments, availability, notifications };
      if (this.loadedFor === userId) this.announce(this.data(), next);
      this.data.set(next);
      this.loadedFor = userId;
      this.loadError.set('');
    } catch (e) {
      if (request === this.latestRequest) this.loadError.set(apiError(e));
    }
  }

  /** Tells the user about things that arrived while the page was open. */
  private announce(before: Data, after: Data): void {
    if (this.auth.role === 'admin') {
      const known = new Set(before.appointments.map(a => a.id));
      const requests = after.appointments.filter(a => a.status === 'Pending' && !known.has(a.id));
      if (requests.length === 1) this.toast.info(`New appointment request from ${requests[0].patient}.`);
      else if (requests.length > 1) this.toast.info(`${requests.length} new appointment requests.`);
      return;
    }
    const known = new Set(before.notifications.map(n => n.id));
    // A patient's own request or reschedule is already confirmed on screen.
    const fresh = after.notifications.filter(n => !known.has(n.id) && !n.read &&
      n.type !== 'REQUEST' && n.type !== 'RESCHEDULE' && n.type !== 'CANCELLATION');
    if (fresh.length === 1) this.toast.info(fresh[0].title);
    else if (fresh.length > 1) this.toast.info(`You have ${fresh.length} new notifications.`);
  }

  /** Available without signing in (login page). */
  async loadClinicInfo(): Promise<void> {
    try {
      this.clinicInfo.set(await firstValueFrom(this.http.get<ClinicInfo>('/api/clinic')));
    } catch {
      // Only affects the contact details shown; pages work without them.
    }
  }

  // ---------- Lookups ----------

  doctor(id: string): Doctor | undefined {
    return this.data().doctors.find(d => d.id === id);
  }

  patient(id: string): Patient | undefined {
    return this.data().patients.find(p => p.id === id);
  }

  // ---------- Availability ----------

  /** Bookable slots for a doctor on a date; booked or past slots are marked unavailable. */
  slotsFor(doctorId: string, date: string): Slot[] {
    const doctor = this.doctor(doctorId);
    const taken = this.busy();
    const today = todayISO();
    const now = nowHHmm();
    const slots: Slot[] = [];
    const blocks = this.schedules()
      .filter(s => s.doctorId === doctorId && s.date === date)
      .sort((x, y) => x.start.localeCompare(y.start));
    for (const b of blocks) {
      for (let t = minutes(b.start); t + b.slotMinutes <= minutes(b.end); t += b.slotMinutes) {
        const time = addMinutes('00:00', t);
        const booked = taken.has(slotKey(doctorId, date, time));
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
    const today = todayISO();
    const last = addDays(today, horizonDays);
    const dates = [...new Set(this.schedules().filter(s => s.doctorId === doctorId).map(s => s.date))]
      .filter(d => d >= today && d <= last)
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
  requestAppointment(input: Omit<BookingInput, 'patientId'>): Promise<Result> {
    return this.send(this.http.post<AppointmentRecord>('/api/appointments', input), a => a.id);
  }

  /** Staff booking on behalf of a patient (status Approved). */
  bookForPatient(input: BookingInput): Promise<Result> {
    return this.send(this.http.post<AppointmentRecord>('/api/appointments', input), a => a.id);
  }

  approve(id: string, note = ''): Promise<Result> {
    return this.changeStatus(id, 'approve', note);
  }

  reject(id: string, reason: string): Promise<Result> {
    return this.changeStatus(id, 'reject', reason);
  }

  /** The server records whether the patient or the clinic cancelled. */
  cancel(id: string, reason = ''): Promise<Result> {
    return this.changeStatus(id, 'cancel', reason);
  }

  complete(id: string, visitSummary: string): Promise<Result> {
    return this.changeStatus(id, 'complete', visitSummary);
  }

  markNoShow(id: string, note = ''): Promise<Result> {
    return this.changeStatus(id, 'no-show', note);
  }

  /** Moves a visit to another free slot with the same doctor. */
  reschedule(id: string, date: string, time: string): Promise<Result> {
    return this.send(this.http.post(`/api/appointments/${id}/reschedule`, { date, time }));
  }

  /** Pending and approved visits with a doctor that haven't started yet. */
  upcomingFor(doctorId: string): AppointmentView[] {
    return this.appointments().filter(a => a.doctorId === doctorId &&
      (a.status === 'Pending' || a.status === 'Approved') && !hasStarted(a.date, a.time));
  }

  // ---------- Patients ----------

  /** Front-desk registration. The server generates a temporary password for the patient. */
  async createPatient(input: PatientInput): Promise<Result & { temporaryPassword?: string }> {
    let temporaryPassword = '';
    const result = await this.send(
      this.http.post<{ patient: Patient; temporaryPassword: string }>('/api/patients', input),
      r => { temporaryPassword = r.temporaryPassword; return r.patient.id; }
    );
    return { ...result, temporaryPassword };
  }

  updatePatient(id: string, changes: Partial<PatientInput> & { emailUpdates?: boolean }): Promise<Result> {
    const target = this.auth.role === 'patient' ? 'me' : id;
    return this.send(this.http.put(`/api/patients/${target}`, changes));
  }

  setPatientStatus(id: string, status: Patient['status']): Promise<Result> {
    return this.send(this.http.put(`/api/patients/${id}/status`, { status }));
  }

  /** Replaces a forgotten password with a temporary one. */
  async resetPatientPassword(id: string): Promise<Result & { temporaryPassword?: string }> {
    let temporaryPassword = '';
    const result = await this.send(
      this.http.post<{ temporaryPassword: string }>(`/api/patients/${id}/reset-password`, {}),
      r => { temporaryPassword = r.temporaryPassword; return id; }
    );
    return { ...result, temporaryPassword };
  }

  // ---------- Doctors ----------

  saveDoctor(doctor: Omit<Doctor, 'id'> & { id?: string }): Promise<Result> {
    const { id, ...fields } = doctor;
    const body = { ...fields, experienceYears: Math.round(Number(fields.experienceYears) || 0) };
    const request = id
      ? this.http.put<Doctor>(`/api/doctors/${id}`, body)
      : this.http.post<Doctor>('/api/doctors', body);
    return this.send(request, d => d.id);
  }

  // ---------- Schedules ----------

  /** Adds availability on `date` (and the same weekday for `repeatWeeks` more weeks). Skips overlapping days. */
  async addAvailability(input: {
    doctorId: string; date: string; start: string; end: string; slotMinutes: number; repeatWeeks: number;
  }): Promise<Result & { created?: number; skipped?: number }> {
    let counts = { created: 0, skipped: 0 };
    const result = await this.send(
      this.http.post<typeof counts>('/api/schedules', input),
      r => { counts = r; return undefined; }
    );
    return { ...result, ...counts };
  }

  /** Removes a block; the server refuses if it has booked (pending/approved) appointments. */
  removeAvailability(blockId: ScheduleBlock['id']): Promise<Result> {
    return this.send(this.http.delete(`/api/schedules/${blockId}`));
  }

  // ---------- Notifications ----------

  markRead(id: string): Promise<Result> {
    return this.send(this.http.post(`/api/notifications/${id}/read`, {}));
  }

  markAllRead(): Promise<Result> {
    return this.send(this.http.post('/api/notifications/read-all', {}));
  }

  // ---------- Admin ----------

  updateAdmin(changes: Omit<AdminProfile, 'passwordUpdatedOn'>): Promise<Result> {
    return this.send(this.http.put('/api/admin/profile', changes));
  }

  // ---------- Internals ----------

  private changeStatus(id: string, action: 'approve' | 'reject' | 'cancel' | 'complete' | 'no-show', text: string): Promise<Result> {
    return this.send(this.http.post(`/api/appointments/${id}/${action}`, { text }));
  }

  /** Sends a change, then reloads so the screen matches the database (also after a refusal). */
  private async send<T>(request: Observable<T>, id?: (response: T) => string | undefined): Promise<Result> {
    let result: Result;
    try {
      const response = await firstValueFrom(request);
      result = { ok: true, id: id?.(response) };
    } catch (e) {
      result = { ok: false, error: apiError(e) };
    }
    await this.refresh();
    return result;
  }
}
