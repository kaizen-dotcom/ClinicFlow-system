import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  constructor(private router: Router) {}

  // Controls password visibility
  showPassword = signal(false);

  // Login form data
  email = '';
  password = '';
  rememberMe = false;

  // Toggle password visibility
  togglePassword() {
    this.showPassword.update(value => !value);
  }

  goToAdmin() {
    this.router.navigate(['/admin/dashboard']);
  }

  goToSignUp() {
    this.router.navigate(['/sign-up']);
  }

  // Login form submission
  onSubmit() {
    console.log('Email:', this.email);
    console.log('Password:', this.password);
    console.log('Remember me:', this.rememberMe);

    this.goToAdmin();

    // Authentication will be connected to the backend later.
  }
}
