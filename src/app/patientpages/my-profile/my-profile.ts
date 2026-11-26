import { ToastService } from '../../shared/services/toast.service';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ClinicStore } from '../../shared/services/clinic-store.service';
import { PatientAppointmentsService } from '../../shared/services/patient-appointments.service';
import { ChangePassword } from '../../shared/components/change-password/change-password';
import { todayISO } from '../../shared/utils/time';
import { DatePicker } from '../../shared/components/date-picker/date-picker';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ChangePassword, DatePicker],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.css'
})
export class MyProfile {
  /** Latest date of birth accepted. */
  readonly today = todayISO();
  private readonly clinic = inject(ClinicStore);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly mine = inject(PatientAppointmentsService);

  profile = this.fromStore();
  emailUpdatesEnabled = this.mine.patient.emailUpdates;
  message = '';
  error = '';
  saving = false;

  async save(form: NgForm) {
    this.message = '';
    this.error = '';
    if (this.saving) return;
    if (form.invalid) {
      this.error = 'Please fill in all required fields with valid values.';
      return;
    }
    this.saving = true;
    const result = await this.clinic.updatePatient(this.mine.patient.id, {
      fullName: `${this.profile.firstName.trim()} ${this.profile.lastName.trim()}`.trim(),
      dob: this.profile.dob,
      gender: this.profile.gender,
      email: this.profile.email,
      phone: this.profile.phone.trim(),
      address: this.profile.address.trim()
    });
    this.saving = false;
    this.cdr.markForCheck();
    if (result.ok) {
      this.message = 'Your profile has been saved.';
      this.toast.success('Your profile has been saved.');
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

  async toggleEmailUpdates(enabled: boolean) {
    this.emailUpdatesEnabled = enabled;
    const result = await this.clinic.updatePatient(this.mine.patient.id, { emailUpdates: enabled });
    if (!result.ok) {
      this.emailUpdatesEnabled = !enabled;
      this.error = result.error;
    } else {
      this.toast.success(enabled ? 'Email updates turned on.' : 'Email updates turned off.');
    }
    this.cdr.markForCheck();
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
