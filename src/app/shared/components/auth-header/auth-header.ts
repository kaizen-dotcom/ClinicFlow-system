import { Component, inject } from '@angular/core';
import { ClinicStore } from '../../services/clinic-store.service';

@Component({
  selector: 'app-auth-header',
  standalone: true,
  imports: [],
  templateUrl: './auth-header.html',
  styleUrl: './auth-header.css'
})
export class AuthHeader {
  readonly clinic = inject(ClinicStore);

  constructor() {
    void this.clinic.loadClinicInfo();
  }
}