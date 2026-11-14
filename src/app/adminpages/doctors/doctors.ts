import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctors.html',
  styleUrl: './doctors.css'
})
export class Doctors {
  // 1. Stat Cards (4 cards in this page)
  statCards = [
    { label: 'Total doctors', value: '16', subtext: 'Across 8 specialities' },
    { label: 'Available today', value: '12', subtext: 'Accepting appointments' },
    { label: 'On leave', value: '04', subtext: 'View availability' }
  ];

  // 2. Table Data
  doctors = [
    { name: 'Dr. Amelia Brooks', specialty: 'General medicine', email: 'a.brooks@clinicflow.com', hours: '09:00 – 17:00', status: 'Available' },
    { name: 'Dr. Daniel Kim', specialty: 'Cardiology', email: 'd.kim@clinicflow.com', hours: '09:00 – 18:00', status: 'Available' },
    { name: 'Dr. Maya Patel', specialty: 'Dentistry', email: 'm.patel@clinicflow.com', hours: '10:00 – 18:00', status: 'Available' },
    { name: 'Dr. Elena Garcia', specialty: 'Pediatrics', email: 'e.garcia@clinicflow.com', hours: '08:00 – 16:00', status: 'Available' },
    { name: 'Dr. Oliver Chen', specialty: 'Dermatology', email: 'o.chen@clinicflow.com', hours: '09:00 – 17:00', status: 'Available' },
    { name: 'Dr. Grace Lewis', specialty: 'General medicine', email: 'g.lewis@clinicflow.com', hours: 'Not scheduled', status: 'On leave' },
    { name: 'Dr. Ethan Clark', specialty: 'Orthopedics', email: 'e.clark@clinicflow.com', hours: '10:00 – 18:00', status: 'Available' },
    { name: 'Dr. Ava Robinson', specialty: 'Pediatrics', email: 'a.robinson@clinicflow.com', hours: 'Not scheduled', status: 'On leave' }
  ];

  // Helper for status badge
  getStatusClass(status: string): string {
    return status === 'Available' ? 'badge-active' : 'badge-inactive';
  }
}