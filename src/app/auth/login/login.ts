import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { ClinicStore } from '../../shared/services/clinic-store.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  constructor(private router: Router, private auth: AuthService) {}

  readonly clinic = inject(ClinicStore);

  // True while the sign-in request is running
  busy = signal(false);

  // Controls password visibility
  showPassword = signal(false);

  // Error shown above the login button
  error = signal('');

  // Shown when "Forgot password?" is clicked
  showResetHelp = signal(false);

  // Set when arriving from a successful sign-up
  private readonly registeredEmail: string = history.state?.registeredEmail ?? '';
  readonly justRegistered = !!this.registeredEmail;

  // Login form data
  email = this.registeredEmail;
  password = '';
  rememberMe = false;

  // Toggle password visibility
  togglePassword() {
    this.showPassword.update(value => !value);
  }

  goToSignUp() {
    this.router.navigate(['/sign-up']);
  }

  // Login form submission: send each role to its own dashboard.
  async onSubmit() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    const result = await this.auth.login(this.email, this.password, this.rememberMe);
    if ('error' in result) {
      this.error.set(result.error);
    } else {
      await this.router.navigateByUrl(this.auth.homeFor(result.role));
    }
    this.busy.set(false);
  }
}
