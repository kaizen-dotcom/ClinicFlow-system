import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  // 1. Stat Cards Data
  statCards = [
    { label: "Today's appointments", value: '32', subtext: '↑ 4 from yesterday', isPositive: true },
    { label: "Pending requests", value: '08', subtext: 'Needs your review', isPositive: false },
    { label: "Available doctors", value: '12', subtext: 'of 16 doctors', isPositive: false },
    { label: "Registered patients", value: '1,284', subtext: '↑ 24 this month', isPositive: true }
  ];

  // 2. Pending Requests Data
  pendingRequests = [
    { patient: 'Emma Wilson', appointment: 'General consultation', doctor: 'Dr. Amelia Brooks', dateTime: '11 Nov · 09:00' },
    { patient: 'James Anderson', appointment: 'Follow-up visit', doctor: 'Dr. Daniel Kim', dateTime: '11 Nov · 10:30' },
    { patient: 'Olivia Martin', appointment: 'Dental checkup', doctor: 'Dr. Maya Patel', dateTime: '12 Nov · 11:00' }
  ];

  // 3. Today's Appointments Data
  todaysAppointments = [
    { time: '09:00', patient: 'Liam Johnson', doctor: 'Dr. Amelia Brooks', type: 'General consultation', status: 'Completed' },
    { time: '09:30', patient: 'Sophia Davis', doctor: 'Dr. Daniel Kim', type: 'Follow-up visit', status: 'Completed' },
    { time: '10:00', patient: 'Noah Williams', doctor: 'Dr. Amelia Brooks', type: 'General consultation', status: 'Approved' },
    { time: '10:30', patient: 'Isabella Brown', doctor: 'Dr. Maya Patel', type: 'Dental checkup', status: 'Approved' }
  ];

  // Helper function to map status to CSS classes
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'badge-completed';
      case 'approved': return 'badge-approved';
      case 'pending': return 'badge-pending';
      default: return 'badge-gray';
    }
  }
}