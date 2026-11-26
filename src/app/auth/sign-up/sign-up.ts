import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { todayISO } from '../../shared/utils/time';
import { DatePicker } from '../../shared/components/date-picker/date-picker';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePicker],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class Signup {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

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
  busy = false;

  /** Latest date of birth accepted (today). */
  readonly maxDob = todayISO();

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

  // Creates the patient account, then sends the patient to the login page.
  async onSubmit(ngForm: NgForm) {
    this.submitted = true;
    this.error = '';
    if (this.busy || ngForm.invalid || this.form.password.length < 8 || this.form.password !== this.form.confirmPassword || !this.form.terms) {
      return;
    }
    this.busy = true;
    const result = await this.auth.register({
      fullName: this.form.fullName,
      email: this.form.email,
      phone: this.form.phone,
      dob: this.form.dob,
      password: this.form.password
    });
    if ('error' in result) {
      this.error = result.error;
    } else {
      // The email travels in the navigation state (not the URL) so the login form can be prefilled.
      await this.router.navigateByUrl('/login', { state: { registeredEmail: this.form.email.trim() } });
    }
    this.busy = false;
    this.cdr.markForCheck();
  }
}
