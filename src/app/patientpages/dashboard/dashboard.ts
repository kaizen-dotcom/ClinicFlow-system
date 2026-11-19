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
  patientName = 'Emma';
  
  nextVisit = {
    type: 'General consultation',
    doctor: 'Dr. Amelia Brooks',
    specialty: 'General medicine',
    date: 'Thursday, 12 November',
    time: '09:00–09:30 AM',
    location: 'ClinicFlow · Room 204',
    status: 'Approved',
    note: 'Please arrive 15 minutes before your appointment.'
  };

  stats = [
    { value: '01', label: 'Upcoming visit' },
    { value: '01', label: 'Pending request' },
    { value: '03', label: 'Completed visits' }
  ];

  recentActivity = [
    { type: 'Follow-up consultation', doctor: 'Dr. Daniel Kim', date: '18 Nov · 10:30 AM', status: 'Pending' },
    { type: 'General consultation', doctor: 'Dr. Amelia Brooks', date: '12 Nov · 09:00 AM', status: 'Approved' }
  ];

  getStatusClass(status: string): string {
    switch(status.toLowerCase()) {
      case 'approved': return 'badge-approved';
      case 'pending': return 'badge-pending';
      default: return 'badge-default';
    }
  }
}