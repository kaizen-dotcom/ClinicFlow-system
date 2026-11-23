import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { AppointmentView, ClinicStore, Result } from './clinic-store.service';
import { Patient } from './clinic.models';

export type { AppointmentStatus, StatusEvent } from './clinic.models';
export type Appointment = AppointmentView;

const EMPTY_PATIENT: Patient = {
  id: '', fullName: '', email: '', phone: '', dob: '', gender: '', address: '',
  registeredOn: '', status: 'Active', password: '', emailUpdates: false
};

/** The logged-in patient's view of the ClinicStore. */
@Injectable({ providedIn: 'root' })
export class PatientAppointmentsService {
  private readonly store = inject(ClinicStore);
  private readonly auth = inject(AuthService);

  readonly currentPatient = computed(() => {
    const id = this.auth.patientId();
    return (id && this.store.patients().find(p => p.id === id)) || EMPTY_PATIENT;
  });

  get patient(): Patient {
    return this.currentPatient();
  }

  /** Upcoming (pending/approved) first, soonest first; then previous visits, newest first. */
  readonly appointments = computed(() => {
    const mine = this.store.appointments().filter(a => a.patientId === this.currentPatient().id);
    const upcoming = mine.filter(a => this.isUpcoming(a));
    const previous = mine.filter(a => !this.isUpcoming(a)).reverse();
    return [...upcoming, ...previous];
  });

  readonly notifications = computed(() =>
    this.store.notifications()
      .filter(n => n.patientId === this.currentPatient().id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );

  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  /** The appointment currently shown in the details modal. */
  readonly viewingId = signal<string | null>(null);
  readonly viewing = computed(() => this.appointments().find(a => a.id === this.viewingId()) ?? null);

  isUpcoming(a: Appointment): boolean {
    return a.status === 'Pending' || a.status === 'Approved';
  }

  view(id: string): void {
    this.viewingId.set(id);
  }

  closeView(): void {
    this.viewingId.set(null);
  }

  cancel(id: string, reason: string): Result {
    return this.store.cancel(id, 'patient', reason);
  }
}
