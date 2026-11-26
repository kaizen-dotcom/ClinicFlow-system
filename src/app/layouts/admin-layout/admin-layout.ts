import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClinicStore } from '../../shared/services/clinic-store.service';
import { MenuService } from '../../shared/services/menu.service';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';
import { NavbarComponent } from '../../shared/components/navbar/navbar';
import { AdminAppointmentModal } from '../../shared/components/admin-appointment-modal/admin-appointment-modal';
import { AdminNewAppointmentModal } from '../../shared/components/admin-new-appointment-modal/admin-new-appointment-modal';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, NavbarComponent, AdminAppointmentModal, AdminNewAppointmentModal],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.css']
})
export class AdminLayoutComponent {
  readonly clinic = inject(ClinicStore);
  readonly menu = inject(MenuService);
}