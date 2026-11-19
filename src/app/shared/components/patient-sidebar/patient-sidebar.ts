import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  LucideDynamicIcon,
  LucideLayoutDashboard,
  LucideSearch,
  LucideCalendarPlus,
  LucideCalendar,
  LucideBell,
  LucideUser,
  LucidePlus,
  LucideLogOut
} from '@lucide/angular';

@Component({
  selector: 'app-patient-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideDynamicIcon],
  templateUrl: './patient-sidebar.html',
  styleUrls: ['./patient-sidebar.css']
})
export class PatientSidebarComponent {
  readonly PlusIcon = LucidePlus;
  readonly logoutIcon = LucideLogOut;
  showLogoutConfirm = false;

  menuItems = [
    { label: 'Dashboard', icon: LucideLayoutDashboard, route: '/patient/dashboard' },
    { label: 'Browse doctors', icon: LucideSearch, route: '/patient/browse-doctors' },
    { label: 'Book appointment', icon: LucideCalendarPlus, route: '/patient/book-appointment' },
    { label: 'My appointments', icon: LucideCalendar, route: '/patient/appointments' },
    { label: 'Notifications', icon: LucideBell, route: '/patient/notifications' },
    { label: 'My profile', icon: LucideUser, route: '/patient/profile' }
  ];

  confirmLogout(): void {
    this.showLogoutConfirm = true;
  }

  cancelLogout(): void {
    this.showLogoutConfirm = false;
  }

  logout(): void {
    this.showLogoutConfirm = false;
    window.location.href = '/login';
  }
}