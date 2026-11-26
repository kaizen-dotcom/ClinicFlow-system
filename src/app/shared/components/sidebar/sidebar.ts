import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../auth/auth.service';
// 1. Import LucideIcon (the dynamic directive) and the specific icons
import {
  LucideDynamicIcon,
  LucideLayoutDashboard,
  LucideCalendar,
  LucideUsers,
  LucideStethoscope,
  LucideClock,
  LucideBarChart2,
  LucideUser,
  LucideLogOut,
  LucideLayoutGrid,
  LucideChevronDown,
  LucideChevronUp
} from '@lucide/angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  // 2. Import LucideIcon instead of LucideAngularModule
  imports: [CommonModule, RouterModule, LucideDynamicIcon],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent {
  readonly logoutIcon = LucideLogOut;
  readonly mainIcon = LucideLayoutGrid;
  readonly openIcon = LucideChevronUp;
  readonly closedIcon = LucideChevronDown;
  menuOpen = true;
  showLogoutConfirm = false;

  constructor(private router: Router, private auth: AuthService) {}

  menuItems = [
    { label: 'Dashboard', icon: LucideLayoutDashboard, route: '/admin/dashboard' },
    { label: 'Appointments', icon: LucideCalendar, route: '/admin/appointments' },
    { label: 'Patients', icon: LucideUsers, route: '/admin/patients' },
    { label: 'Doctors', icon: LucideStethoscope, route: '/admin/doctors' },
    { label: 'Schedules', icon: LucideClock, route: '/admin/schedules' },
    { label: 'Reports', icon: LucideBarChart2, route: '/admin/reports' },
    { label: 'Profile and settings', icon: LucideUser, route: '/admin/settings' }
  ];

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

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