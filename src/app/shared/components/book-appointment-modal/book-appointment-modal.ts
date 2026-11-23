import { Component, HostListener, effect, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingModalService } from '../../services/booking-modal.service';
import { ClinicStore } from '../../services/clinic-store.service';
import { PatientAppointmentsService } from '../../services/patient-appointments.service';
import { APPOINTMENT_TYPES, Slot } from '../../services/clinic.models';

@Component({
  selector: 'app-book-appointment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './book-appointment-modal.html',
  styleUrl: './book-appointment-modal.css'
})
export class BookAppointmentModal {
  readonly modal = inject(BookingModalService);
  readonly clinic = inject(ClinicStore);
  private readonly mine = inject(PatientAppointmentsService);
  private readonly router = inject(Router);

  readonly appointmentTypes = APPOINTMENT_TYPES;

  form = this.emptyForm();
  dates: string[] = [];
  slots: Slot[] = [];
  submitted = false;
  sent = false;
  error = '';
  createdId = '';

  constructor() {
    // Reset the form each time the modal opens, applying any preselected doctor/date/time.
    effect(() => {
      if (!this.modal.isOpen()) return;
      const preset = this.modal.preset();
      untracked(() => {
        this.form = this.emptyForm();
        this.submitted = false;
        this.sent = false;
        this.error = '';
        this.form.doctorId = preset.doctorId && this.clinic.doctor(preset.doctorId)?.status === 'Active' ? preset.doctorId : '';
        this.onDoctorChange(preset.date, preset.time);
      });
    });
  }

  get patientId(): string {
    return this.mine.patient.id;
  }

  get doctor() {
    return this.form.doctorId ? this.clinic.doctor(this.form.doctorId) : undefined;
  }

  get slot(): Slot | undefined {
    return this.slots.find(s => s.time === this.form.time);
  }

  /** Reloads the dates with free slots for the chosen doctor; optionally keeps a preselected date/time. */
  onDoctorChange(date?: string, time?: string): void {
    this.dates = this.form.doctorId ? this.clinic.availableDates(this.form.doctorId, 10) : [];
    this.form.date = date && this.dates.includes(date) ? date : (this.dates[0] ?? '');
    this.loadSlots(time);
  }

  selectDate(date: string): void {
    this.form.date = date;
    this.loadSlots();
  }

  selectSlot(slot: Slot): void {
    if (slot.available) this.form.time = slot.time;
  }

  submit(ngForm: NgForm): void {
    this.submitted = true;
    this.error = '';
    if (ngForm.invalid || !this.form.doctorId || !this.form.date || !this.form.time) return;

    // Keep the patient's contact details up to date.
    const contact = this.clinic.updatePatient(this.patientId, {
      fullName: this.form.fullName.trim(), dob: this.form.dob, gender: this.form.gender,
      phone: this.form.phone.trim(), email: this.form.email
    });
    if (!contact.ok) { this.error = contact.error; return; }

    const result = this.clinic.requestAppointment({
      patientId: this.patientId, doctorId: this.form.doctorId, date: this.form.date, time: this.form.time,
      type: this.form.type, reason: this.form.reason, notes: this.form.notes, firstVisit: this.form.firstVisit
    });
    if (!result.ok) {
      this.error = result.error;
      this.loadSlots(); // the slot may have just been taken
      return;
    }
    this.createdId = result.id ?? '';
    this.sent = true;
  }

  close(): void {
    this.modal.close();
  }

  viewAppointment(): void {
    this.close();
    this.router.navigateByUrl('/patient/appointments');
    if (this.createdId) this.mine.view(this.createdId);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modal.isOpen()) this.close();
  }

  private loadSlots(time?: string): void {
    this.slots = this.form.doctorId && this.form.date ? this.clinic.slotsFor(this.form.doctorId, this.form.date) : [];
    this.form.time = time && this.slots.some(s => s.time === time && s.available) ? time : '';
  }

  private emptyForm() {
    // Patient details are prefilled from the profile and can be corrected here.
    const p = this.mine.patient;
    return {
      fullName: p.fullName, dob: p.dob, gender: p.gender || 'Prefer not to say', phone: p.phone, email: p.email,
      doctorId: '', date: '', time: '', type: APPOINTMENT_TYPES[0], reason: '', notes: '',
      firstVisit: false, consent: false
    };
  }
}
