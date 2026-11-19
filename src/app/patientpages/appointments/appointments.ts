import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './appointments.html',
  styleUrl: './appointments.css'
})
export class MyAppointments {
  activeTab = 'all';

  tabs = [
    { label: 'All appointments', value: 'all', count: null },
    { label: 'Upcoming', value: 'upcoming', count: 2 },
    { label: 'Previous', value: 'previous', count: 5 }
  ];

  appointments = [
    {
      date: '12 Nov 2026',
      time: '09:00–09:30 AM',
      doctor: 'Dr. Amelia Brooks',
      type: 'General consultation',
      location: 'Room 204',
      status: 'Approved',
      action: 'View / cancel'
    },
    {
      date: '18 Nov 2026',
      time: '10:30–11:00 AM',
      doctor: 'Dr. Daniel Kim',
      type: 'Follow-up consultation',
      location: 'Room 108',
      status: 'Pending',
      action: 'View / cancel'
    },
    {
      date: '09 Nov 2026',
      time: '02:00–02:30 PM',
      doctor: 'Dr. James Carter',
      type: 'Skin consultation',
      location: 'Room 302',
      status: 'Rejected',
      action: 'View details'
    },
    {
      date: '05 Nov 2026',
      time: '11:00–11:30 AM',
      doctor: 'Dr. Maya Patel',
      type: 'Dental check-up',
      location: 'Room 105',
      status: 'Cancelled',
      action: 'View details'
    },
    {
      date: '03 Nov 2026',
      time: '09:00–09:30 AM',
      doctor: 'Dr. Amelia Brooks',
      type: 'General consultation',
      location: 'Room 204',
      status: 'Completed',
      action: 'View details'
    },
    {
      date: '21 Oct 2026',
      time: '10:00–10:30 AM',
      doctor: 'Dr. Daniel Kim',
      type: 'Heart health review',
      location: 'Room 108',
      status: 'Completed',
      action: 'View details'
    },
    {
      date: '07 Oct 2026',
      time: '11:00–11:30 AM',
      doctor: 'Dr. Maya Patel',
      type: 'Dental check-up',
      location: 'Room 105',
      status: 'Completed',
      action: 'View details'
    }
  ];

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved': return 'badge-approved';
      case 'pending': return 'badge-pending';
      case 'completed': return 'badge-completed';
      case 'rejected': return 'badge-rejected';
      case 'cancelled': return 'badge-cancelled';
      default: return 'badge-default';
    }
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }
}