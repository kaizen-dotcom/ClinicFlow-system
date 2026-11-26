import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef, Component, HostListener, effect, inject } from '@angular/core';
import { ClinicStore } from '../../services/clinic-store.service';
import { hasStarted } from '../../utils/time';
import { ReschedulePicker } from '../reschedule-picker/reschedule-picker';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Appointment, PatientAppointmentsService } from '../../services/patient-appointments.service';
import { BookingModalService } from '../../services/booking-modal.service';

@Component({
  selector: 'app-appointment-details-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReschedulePicker],
  templateUrl: './appointment-details-modal.html',
  styleUrl: './appointment-details-modal.css'
})
export class AppointmentDetailsModal {
  readonly store = inject(PatientAppointmentsService);
  private readonly booking = inject(BookingModalService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  confirmingCancel = false;
  cancelReason = '';
  rescheduling = false;
  done = '';
  error = '';
  busy = false;
  readonly clinic = inject(ClinicStore);

  constructor() {
    // Reset the cancel form whenever a different appointment is opened.
    effect(() => {
      this.store.viewingId();
      this.confirmingCancel = false;
      this.cancelReason = '';
      this.rescheduling = false;
      this.done = '';
      this.error = '';
    });
  }

  /** Upcoming visits that haven't started can be cancelled or moved. */
  canChange(a: Appointment): boolean {
    return this.store.isUpcoming(a) && !hasStarted(a.date, a.time);
  }

  rescheduled(): void {
    this.rescheduling = false;
    this.done = 'Your new time was sent to the clinic for review.';
  }

  async confirmCancel(a: Appointment): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    const result = await this.store.cancel(a.id, this.cancelReason);
    this.busy = false;
    if (result.ok) {
      this.confirmingCancel = false;
      this.toast.success('Appointment cancelled.');
    } else {
      this.error = result.error;
    }
    this.cdr.markForCheck();
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
