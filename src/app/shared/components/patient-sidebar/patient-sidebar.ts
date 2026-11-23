import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
import { BookingModalService } from '../../services/booking-modal.service';
import {
  LucideDynamicIcon,
  LucideLayoutDashboard,
  LucideSearch,
  LucideCalendarPlus,
  LucideCalendar,
  LucideBell,
  LucideUser,
  LucideLogOut,
  LucideArrowUpRight
} from '@lucide/angular';

@Component({
  selector: 'app-patient-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideDynamicIcon],
  templateUrl: './patient-sidebar.html',
  styleUrls: ['./patient-sidebar.css']
})
export class PatientSidebarComponent {
  readonly logoutIcon = LucideLogOut;
  readonly ArrowUpRightIcon = LucideArrowUpRight;
  showLogoutConfirm = false;

  constructor(private router: Router, private auth: AuthService, public booking: BookingModalService) {}

  menuItems = [
    { label: 'Dashboard', icon: LucideLayoutDashboard, route: '/patient/dashboard' },
    { label: 'Browse doctors', icon: LucideSearch, route: '/patient/browse-doctors' },
    // No route: opens the booking modal instead of navigating.
    { label: 'Book appointment', icon: LucideCalendarPlus, route: null },
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
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}