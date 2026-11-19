import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.css'
})
export class MyProfile {
  // Personal information form data
  profile = {
    firstName: 'Emma',
    lastName: 'Wilson',
    dob: '1992-03-14',
    gender: 'Female',
    email: 'emma.wilson@example.com',
    phone: '+1 (555) 014-2086',
    address: '24 Oak Street, Springfield'
  };

  // Patient account info
  account = {
    patientId: 'CF-1024',
    registeredSince: 'October 2026'
  };

  // Notification toggle
  emailUpdatesEnabled = true;
}