import { ToastService } from '../../shared/services/toast.service';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ClinicStore } from '../../shared/services/clinic-store.service';
import { ChangePassword } from '../../shared/components/change-password/change-password';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ChangePassword],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings {
  readonly clinic = inject(ClinicStore);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  account = this.fromStore();
  accountMessage = '';
  accountError = '';

  saving = false;

  async saveAccount(f: NgForm) {
    this.accountMessage = '';
    this.accountError = '';
    if (this.saving) return;
    if (f.invalid) {
      this.accountError = 'Please fill in all fields with valid values.';
      return;
    }
    this.saving = true;
    const r = await this.clinic.updateAdmin({
      fullName: this.account.fullName.trim(), email: this.account.email.trim().toLowerCase(),
      phone: this.account.phone.trim(), clinicName: this.account.clinicName.trim()
    });
    this.saving = false;
    if (r.ok) {
      this.account = this.fromStore();
      this.toast.success('Changes saved.');
      this.accountMessage = 'Changes saved. Use this email address next time you log in.';
      f.form.markAsPristine();
    } else {
      this.accountError = r.error;
    }
    this.cdr.markForCheck();
  }

  cancel(f: NgForm) {
    this.account = this.fromStore();
    this.accountMessage = '';
    this.accountError = '';
    f.form.markAsPristine();
  }

  private fromStore() {
    const a = this.clinic.admin();
    return { fullName: a.fullName, email: a.email, phone: a.phone, clinicName: a.clinicName };
  }
}
