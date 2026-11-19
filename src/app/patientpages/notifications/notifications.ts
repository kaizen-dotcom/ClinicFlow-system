import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class Notifications {
  activeTab = 'all';

  notifications = [
    {
      type: 'APPROVAL',
      title: 'Your appointment is approved',
      doctor: 'Dr. Amelia Brooks · Thu, 12 Nov · 09:00–09:30 AM',
      message: 'Your visit is confirmed. Please arrive 15 minutes early.',
      time: 'Today · 09:20 AM',
      action: 'View appointment →',
      unread: true
    },
    {
      type: 'SCHEDULE UPDATE',
      title: 'New times available with Dr. Amelia Brooks',
      doctor: 'Monday, 16 November · General medicine',
      message: 'Additional morning appointments are now open for booking.',
      time: 'Today · 08:45 AM',
      action: 'View schedule →',
      unread: true
    },
    {
      type: 'REJECTION',
      title: 'Your appointment request was not approved',
      doctor: 'Dr. James Carter · Mon, 09 Nov · 02:00 PM',
      message: 'The doctor is unavailable. Please choose another date.',
      time: '09 Nov · 10:15 AM',
      action: 'Find another time →',
      unread: false
    },
    {
      type: 'CANCELLATION',
      title: 'Your appointment was cancelled',
      doctor: 'Dr. Maya Patel · Thu, 05 Nov · 11:00 AM',
      message: 'Cancelled at your request. You can book a new visit anytime.',
      time: '04 Nov · 03:30 PM',
      action: 'Book a new visit →',
      unread: false
    }
  ];

  setTab(tab: string) {
    this.activeTab = tab;
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.unread = false);
  }

  get unreadCount(): number {
    return this.notifications.filter(notification => notification.unread).length;
  }
}