import { Component, HostListener, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appointment, PatientAppointmentsService } from '../../services/patient-appointments.service';
import { BookingModalService } from '../../services/booking-modal.service';

@Component({
  selector: 'app-appointment-details-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointment-details-modal.html',
  styleUrl: './appointment-details-modal.css'
})
export class AppointmentDetailsModal {
  readonly store = inject(PatientAppointmentsService);
  private readonly booking = inject(BookingModalService);

  confirmingCancel = false;
  cancelReason = '';

  constructor() {
    // Reset the cancel form whenever a different appointment is opened.
    effect(() => {
      this.store.viewingId();
      this.confirmingCancel = false;
      this.cancelReason = '';
    });
  }

  canCancel(a: Appointment): boolean {
    return this.store.isUpcoming(a);
  }

  confirmCancel(a: Appointment): void {
    this.store.cancel(a.id, this.cancelReason);
    this.confirmingCancel = false;
  }

  /** Book again / follow-up with the same doctor. */
  bookAgain(a: Appointment): void {
    this.close();
    this.booking.open(a.doctorId);
  }

  close(): void {
    this.store.closeView();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.store.viewing()) {
      this.close();
    }
  }
}
