import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ClinicStore } from '../../shared/services/clinic-store.service';
import { PatientAppointmentsService } from '../../shared/services/patient-appointments.service';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.css'
})
export class MyProfile {
  private readonly clinic = inject(ClinicStore);
  readonly mine = inject(PatientAppointmentsService);

  profile = this.fromStore();
  emailUpdatesEnabled = this.mine.patient.emailUpdates;
  message = '';
  error = '';

  save(form: NgForm) {
    this.message = '';
    this.error = '';
    if (form.invalid) {
      this.error = 'Please fill in all required fields with valid values.';
      return;
    }
    const result = this.clinic.updatePatient(this.mine.patient.id, {
      fullName: `${this.profile.firstName.trim()} ${this.profile.lastName.trim()}`.trim(),
      dob: this.profile.dob,
      gender: this.profile.gender,
      email: this.profile.email,
      phone: this.profile.phone.trim(),
      address: this.profile.address.trim()
    });
    if (result.ok) {
      this.message = 'Your profile has been saved.';
      form.form.markAsPristine();
    } else {
      this.error = result.error;
    }
  }

  discard(form: NgForm) {
    this.profile = this.fromStore();
    this.message = '';
    this.error = '';
    form.form.markAsPristine();
  }

  toggleEmailUpdates(enabled: boolean) {
    this.emailUpdatesEnabled = enabled;
    this.clinic.updatePatient(this.mine.patient.id, { emailUpdates: enabled });
  }

  private fromStore() {
    const p = this.mine.patient;
    const [firstName, ...rest] = p.fullName.split(' ');
    return {
      firstName: firstName ?? '', lastName: rest.join(' '), dob: p.dob, gender: p.gender || 'Prefer not to say',
      email: p.email, phone: p.phone, address: p.address
    };
  }
}
