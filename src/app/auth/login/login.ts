import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  constructor(private router: Router, private auth: AuthService) {}

  // Controls password visibility
  showPassword = signal(false);

  // Error shown above the login button
  error = signal('');

  // Shown when "Forgot password?" is clicked
  showResetHelp = signal(false);

  // Login form data
  email = '';
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
  // Authentication will be connected to the backend later.
  onSubmit() {
    const result = this.auth.login(this.email, this.password, this.rememberMe);
    if ('error' in result) {
      this.error.set(result.error);
      return;
    }
    this.error.set('');
    this.router.navigateByUrl(this.auth.homeFor(result.role));
  }
}
