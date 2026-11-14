import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appointments.html',
  styleUrls: ['./appointments.css']
})
export class AppointmentsComponent {
  // 1. Stat Cards
  statCards = [
    { label: 'Total appointments', value: '248', subtext: '+12% vs last month' },
    { label: 'Pending', value: '32', subtext: 'Need review' },
    { label: 'Approved', value: '180', subtext: 'Confirmed visits' },
    { label: 'Cancelled', value: '12', subtext: 'Rescheduled' }
  ];

  // 2. Tabs
  tabs = [
    { label: 'All', active: true, count: 248 },
    { label: 'Pending', active: false, count: 32 },
    { label: 'Approved', active: false, count: 180 },
    { label: 'Completed', active: false, count: 148 }
  ];

  // 3. Table Data
  appointments = [
    { id: 'APT-1001', patient: 'John Smith', doctor: 'Dr. Emma Stone', dateTime: 'Nov 15, 2026, 09:00', status: 'Pending' },
    { id: 'APT-1002', patient: 'Sarah Lee', doctor: 'Dr. Michael Chen', dateTime: 'Nov 15, 2026, 10:30', status: 'Approved' },
    { id: 'APT-1003', patient: 'David Brown', doctor: 'Dr. Olivia Park', dateTime: 'Nov 16, 2026, 11:00', status: 'Completed' },
    { id: 'APT-1004', patient: 'Mia Wilson', doctor: 'Dr. Noah Davis', dateTime: 'Nov 17, 2026, 13:15', status: 'Cancelled' }
  ];

  // Helper to set the correct badge color
  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending':
        return 'badge-pending';
      case 'Approved':
        return 'badge-approved';
      case 'Completed':
        return 'badge-completed';
      case 'Cancelled':
        return 'badge-cancelled';
      default:
        return 'badge-default';
    }
  }
}