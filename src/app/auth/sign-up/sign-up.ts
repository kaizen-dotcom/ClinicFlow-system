
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class Signup {
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  
  constructor(private router: Router) {}

  togglePassword() {
    this.showPassword.update(value => !value);
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.update(value => !value);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
