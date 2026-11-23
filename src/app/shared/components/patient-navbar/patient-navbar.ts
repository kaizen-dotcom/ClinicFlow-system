import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon, LucideChevronDown, LucideMoon, LucideSun, LucideBell } from '@lucide/angular';
import { ThemeService } from '../../services/theme.service';
import { PatientAppointmentsService } from '../../services/patient-appointments.service';

@Component({
  selector: 'app-patient-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideDynamicIcon],
  templateUrl: './patient-navbar.html',
  styleUrls: ['./patient-navbar.css']
})
export class PatientNavbarComponent {
  readonly ChevronDownIcon = LucideChevronDown;
  readonly SunIcon = LucideSun;
  readonly MoonIcon = LucideMoon;
  readonly BellIcon = LucideBell;

  readonly theme = inject(ThemeService);
  readonly mine = inject(PatientAppointmentsService);

  tagline = 'Your care, in one place';
}
