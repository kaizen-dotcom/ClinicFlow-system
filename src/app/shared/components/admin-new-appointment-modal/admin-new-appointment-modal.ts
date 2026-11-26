import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef, Component, HostListener, computed, effect, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AdminUiService } from '../../services/admin-ui.service';
import { ClinicStore } from '../../services/clinic-store.service';
import { APPOINTMENT_TYPES, Slot } from '../../services/clinic.models';

/** Staff books an appointment on a patient's behalf (phone / walk-in). Created as Approved. */
@Component({
  selector: 'app-admin-new-appointment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-new-appointment-modal.html'
})
export class AdminNewAppointmentModal {
  readonly ui = inject(AdminUiService);
  readonly clinic = inject(ClinicStore);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly types = APPOINTMENT_TYPES;
  readonly activePatients = computed(() =>
    this.clinic.patients().filter(p => p.status === 'Active').sort((a, b) => a.fullName.localeCompare(b.fullName))
  );

  form = this.empty();
  dates: string[] = [];
  slots: Slot[] = [];
  submitted = false;
  error = '';
  createdId = '';
  busy = false;

  constructor() {
    effect(() => {
      if (!this.ui.newAppointmentOpen()) return;
      const patientId = this.ui.newAppointmentPatientId();
      untracked(() => {
        this.form = this.empty();
        this.form.patientId = patientId ?? '';
        this.dates = [];
        this.slots = [];
        this.submitted = false;
        this.error = '';
        this.createdId = '';
      });
    });
  }

  onDoctorChange(): void {
    this.dates = this.form.doctorId ? this.clinic.availableDates(this.form.doctorId, 10) : [];
    this.selectDate(this.dates[0] ?? '');
  }

  selectDate(date: string): void {
    this.form.date = date;
    this.form.time = '';
    this.slots = date ? this.clinic.slotsFor(this.form.doctorId, date) : [];
  }

  async submit(f: NgForm): Promise<void> {
    this.submitted = true;
    this.error = '';
    if (this.busy || f.invalid || !this.form.date || !this.form.time) return;
    this.busy = true;
    const result = await this.clinic.bookForPatient({
      patientId: this.form.patientId, doctorId: this.form.doctorId, date: this.form.date, time: this.form.time,
      type: this.form.type, reason: this.form.reason, notes: this.form.notes, firstVisit: this.form.firstVisit
    });
    this.busy = false;
    this.cdr.markForCheck();
    if (!result.ok) {
      this.error = result.error;
      this.selectDate(this.form.date);
      return;
    }
    this.createdId = result.id ?? '';
    this.toast.success('Appointment booked. The patient has been notified.');
  }

  openCreated(): void {
    const id = this.createdId;
    this.close();
    this.ui.review(id);
  }

  close(): void {
    this.ui.closeNewAppointment();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.ui.newAppointmentOpen()) this.close();
  }

  private empty() {
    return { patientId: '', doctorId: '', date: '', time: '', type: APPOINTMENT_TYPES[0], reason: '', notes: '', firstVisit: false };
  }
}
