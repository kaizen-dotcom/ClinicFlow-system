import { LucideX } from '@lucide/angular';
import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef, Component, HostListener, effect, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingModalService } from '../../services/booking-modal.service';
import { ClinicStore } from '../../services/clinic-store.service';
import { PatientAppointmentsService } from '../../services/patient-appointments.service';
import { APPOINTMENT_TYPES, Slot } from '../../services/clinic.models';
import { minutes, todayISO } from '../../utils/time';
import { DatePicker } from '../date-picker/date-picker';

@Component({
  selector: 'app-book-appointment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideX, DatePicker],
  templateUrl: './book-appointment-modal.html',
  styleUrl: './book-appointment-modal.css'
})
export class BookAppointmentModal {
  /** Latest date of birth accepted. */
  readonly today = todayISO();
  readonly modal = inject(BookingModalService);
  readonly clinic = inject(ClinicStore);
  private readonly mine = inject(PatientAppointmentsService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  readonly appointmentTypes = APPOINTMENT_TYPES;

  form = this.emptyForm();
  dates: string[] = [];
  slots: Slot[] = [];
  submitted = false;
  sent = false;
  error = '';
  createdId = '';
  busy = false;
  /** Kept so the confirmation can still show the time once it is no longer free. */
  bookedLabel = '';

  constructor() {
    // Someone else may take a time while this window is open.
    effect(() => {
      this.clinic.schedules(); // changes after every reload
      untracked(() => this.syncSlots());
    });

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

  /** True when the patient already has a visit overlapping this time (the server would refuse it). */
  clashes(slot: Slot): boolean {
    return this.mine.appointments().some(a => this.mine.isUpcoming(a) && a.date === this.form.date &&
      minutes(a.time) < minutes(slot.end) && minutes(slot.time) < minutes(a.time) + a.duration);
  }

  selectSlot(slot: Slot): void {
    if (!slot.available || this.clashes(slot)) return;
    this.form.time = slot.time;
    this.error = '';
  }

  async submit(ngForm: NgForm): Promise<void> {
    this.submitted = true;
    this.error = '';
    if (this.busy) return;
    const missing = this.missingFields(ngForm);
    if (missing.length) {
      this.toast.error(`Please complete: ${missing.join(', ')}.`);
      this.showFirstProblem('.error');
      return;
    }
    this.busy = true;
    const { doctorId, date, time, type, reason, notes, firstVisit } = this.form;
    this.bookedLabel = this.slot?.label ?? '';

    // Keep the patient's contact details up to date, then send the request.
    let result = await this.mine.updateContact({
      fullName: this.form.fullName.trim(), dob: this.form.dob, gender: this.form.gender,
      phone: this.form.phone.trim(), email: this.form.email
    });
    if (result.ok) {
      result = await this.clinic.requestAppointment({ doctorId, date, time, type, reason, notes, firstVisit });
      if (!result.ok) this.loadSlots(); // the slot may have just been taken
    }
    this.busy = false;
    this.cdr.markForCheck();
    if (!result.ok) {
      this.submitted = false; // show the server's reason, not "missing field" hints
      this.error = result.error;
      this.toast.error(result.error);
      this.showFirstProblem('.error-box');
      return;
    }
    this.createdId = result.id ?? '';
    this.sent = true;
    this.toast.success('Appointment request sent.');
  }

  private missingFields(ngForm: NgForm): string[] {
    const labels: Record<string, string> = {
      fullName: 'full name', dob: 'date of birth', phone: 'phone number', email: 'a valid email',
      doctorSel: 'doctor', doctorId: 'doctor', reason: 'reason for visit', consent: 'the confirmation checkbox'
    };
    const missing = Object.entries(ngForm.controls).filter(([, c]) => c.invalid).map(([name]) => labels[name] ?? name);
    if (this.form.doctorId && !this.form.time) missing.push('time');
    return [...new Set(missing)];
  }

  /** The form scrolls, so bring the problem into view. */
  private showFirstProblem(selector: string): void {
    setTimeout(() => document.querySelector(`app-book-appointment-modal ${selector}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
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

  /** Redraws the open slots after a live update, keeping the choice if it is still free. */
  private syncSlots(): void {
    if (!this.modal.isOpen() || this.busy || this.sent || !this.form.doctorId) return;
    const chosen = this.form.time;
    this.dates = this.clinic.availableDates(this.form.doctorId, 10);
    if (!this.dates.includes(this.form.date)) this.form.date = this.dates[0] ?? '';
    this.loadSlots(chosen);
    if (chosen && !this.form.time) this.error = 'The time you picked was just taken. Please choose another.';
    this.cdr.markForCheck();
  }

  private loadSlots(time?: string): void {
    this.slots = this.form.doctorId && this.form.date ? this.clinic.slotsFor(this.form.doctorId, this.form.date) : [];
    this.form.time = time && this.slots.some(s => s.time === time && s.available && !this.clashes(s)) ? time : '';
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
