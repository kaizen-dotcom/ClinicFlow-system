import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients.html',
  styleUrl: './patients.css'
})
export class PatientsComponent {
  // 1. Stat Cards
  statCards = [
    { label: 'Registered patients', value: '1,284', subtext: 'All patient records' },
    { label: 'New this month', value: '24', subtext: '↑ 6 from last month', isPositive: true },
    { label: 'Active patients', value: '1,196', subtext: '88 inactive records' }
  ];

  // 2. Table Data
  patients = [
    { name: 'Emma Wilson', contact: 'emma.wilson@example.com', registered: '10 Nov 2026', status: 'Active' },
    { name: 'James Anderson', contact: 'j.anderson@example.com', registered: '09 Nov 2026', status: 'Active' },
    { name: 'Olivia Martin', contact: 'olivia.m@example.com', registered: '08 Nov 2026', status: 'Active' },
    { name: 'Liam Johnson', contact: 'liam.j@example.com', registered: '07 Nov 2026', status: 'Active' },
    { name: 'Sophia Davis', contact: 'sophia.d@example.com', registered: '06 Nov 2026', status: 'Active' },
    { name: 'Noah Williams', contact: 'noah.w@example.com', registered: '05 Nov 2026', status: 'Active' },
    { name: 'Isabella Brown', contact: 'isabella.b@example.com', registered: '04 Nov 2026', status: 'Active' },
    { name: 'Lucas Taylor', contact: 'lucas.t@example.com', registered: '03 Nov 2026', status: 'Inactive' },
    { name: 'Mia Thompson', contact: 'mia.t@example.com', registered: '02 Nov 2026', status: 'Active' }
  ];

  // Helper for status badge
getStatusClass(status: string): string {
    return status === 'Active' ? 'badge-active' : 'badge-inactive';
  }
}