import { Injectable, signal } from '@angular/core';

/** Opens the admin-wide modals (appointment review, new appointment) from any admin page. */
@Injectable({ providedIn: 'root' })
export class AdminUiService {
  readonly reviewingId = signal<string | null>(null);
  readonly newAppointmentOpen = signal(false);
  /** Patient to preselect in the new-appointment modal. */
  readonly newAppointmentPatientId = signal<string | null>(null);

  review(appointmentId: string): void {
    this.reviewingId.set(appointmentId);
  }

  closeReview(): void {
    this.reviewingId.set(null);
  }

  newAppointment(patientId: string | null = null): void {
    this.newAppointmentPatientId.set(patientId);
    this.newAppointmentOpen.set(true);
  }

  closeNewAppointment(): void {
    this.newAppointmentOpen.set(false);
  }
}
