import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClinicStore } from '../../shared/services/clinic-store.service';
import { MenuService } from '../../shared/services/menu.service';
import { RealtimeService } from '../../shared/services/realtime.service';
import { RouterOutlet } from '@angular/router';
import { PatientSidebarComponent } from '../../shared/components/patient-sidebar/patient-sidebar';
import { PatientNavbarComponent } from '../../shared/components/patient-navbar/patient-navbar';
import { BookAppointmentModal } from '../../shared/components/book-appointment-modal/book-appointment-modal';
import { AppointmentDetailsModal } from '../../shared/components/appointment-details-modal/appointment-details-modal';
import { ThemeService } from '../../shared/services/theme.service';

@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, PatientSidebarComponent, PatientNavbarComponent, BookAppointmentModal, AppointmentDetailsModal],
  templateUrl: './patient-layout.html',
  styleUrls: ['./patient-layout.css']
})
export class PatientLayoutComponent implements OnInit, OnDestroy {
  private readonly theme = inject(ThemeService);
  private readonly realtime = inject(RealtimeService);
  readonly clinic = inject(ClinicStore);
  readonly menu = inject(MenuService);

  // Dark mode only applies inside the patient portal; admin and login pages stay light.
  ngOnInit(): void {
    this.theme.apply();
    this.realtime.start();
  }

  ngOnDestroy(): void {
    this.theme.clear();
    this.realtime.stop();
  }
}
