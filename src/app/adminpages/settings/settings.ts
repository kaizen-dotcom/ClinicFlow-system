import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ClinicStore } from '../../shared/services/clinic-store.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings {
  readonly clinic = inject(ClinicStore);

  account = this.fromStore();
  accountMessage = '';
  accountError = '';

  password = { current: '', next: '', confirm: '' };
  showPasswordForm = false;
  passwordMessage = '';
  passwordError = '';

  resetMessage = '';

  saveAccount(f: NgForm) {
    this.accountMessage = '';
    this.accountError = '';
    if (f.invalid) {
      this.accountError = 'Please fill in all fields with valid values.';
      return;
    }
    const email = this.account.email.trim().toLowerCase();
    if (this.clinic.patientByEmail(email)) {
      this.accountError = 'This email belongs to a patient account. Use a different email.';
      return;
    }
    this.clinic.updateAdmin({
      fullName: this.account.fullName.trim(), email, phone: this.account.phone.trim(), clinicName: this.account.clinicName.trim()
    });
    this.accountMessage = 'Changes saved. Use the new email next time you log in.';
    f.form.markAsPristine();
  }

  cancel(f: NgForm) {
    this.account = this.fromStore();
    this.accountMessage = '';
    this.accountError = '';
    f.form.markAsPristine();
  }

  changePassword() {
    this.passwordMessage = '';
    this.passwordError = '';
    if (this.password.next !== this.password.confirm) {
      this.passwordError = 'New passwords do not match.';
      return;
    }
    const r = this.clinic.changeAdminPassword(this.password.current, this.password.next);
    if (!r.ok) {
      this.passwordError = r.error;
      return;
    }
    this.password = { current: '', next: '', confirm: '' };
    this.showPasswordForm = false;
    this.passwordMessage = 'Password updated.';
  }

  resetDemo() {
    if (!confirm('Reset all demo data? Appointments, patients, doctors and schedules you added will be replaced.')) return;
    this.clinic.resetDemoData();
    this.account = this.fromStore();
    this.resetMessage = 'Demo data restored. Admin login: admin@clinicflow.com / Admin@123.';
  }

  private fromStore() {
    const a = this.clinic.admin();
    return { fullName: a.fullName, email: a.email, phone: a.phone, clinicName: a.clinicName };
  }
}
