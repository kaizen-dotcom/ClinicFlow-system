import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { ClinicStore } from '../../shared/services/clinic-store.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class Signup {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly clinic = inject(ClinicStore);

  showPassword = signal(false);
  showConfirmPassword = signal(false);

  form = {
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
    confirmPassword: '',
    terms: false
  };

  submitted = false;
  error = '';

  /** Latest date of birth accepted (today). */
  readonly maxDob = new Date().toISOString().slice(0, 10);

  get passwordTooShort(): boolean {
    return this.form.password.length > 0 && this.form.password.length < 8;
  }

  get passwordsMismatch(): boolean {
    return this.form.confirmPassword.length > 0 && this.form.password !== this.form.confirmPassword;
  }

  togglePassword() {
    this.showPassword.update(value => !value);
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.update(value => !value);
  }

  // Creates the patient account (ClinicStore) and signs the patient in.
  onSubmit(ngForm: NgForm) {
    this.submitted = true;
    this.error = '';
    if (ngForm.invalid || this.form.password.length < 8 || this.form.password !== this.form.confirmPassword || !this.form.terms) {
      return;
    }
    const result = this.clinic.registerPatient({
      fullName: this.form.fullName,
      email: this.form.email,
      phone: this.form.phone,
      dob: this.form.dob,
      password: this.form.password
    });
    if (!result.ok) {
      this.error = result.error;
      return;
    }
    this.auth.loginPatient(result.id!);
    this.router.navigateByUrl('/patient/dashboard');
  }
}
