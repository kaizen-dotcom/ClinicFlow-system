import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon, LucideChevronDown, LucideMoon, LucideSun, LucideBell, LucideMenu, LucideUser } from '@lucide/angular';
import { MenuService } from '../../services/menu.service';
import { LiveBadge } from '../live-badge/live-badge';
import { ThemeService } from '../../services/theme.service';
import { PatientAppointmentsService } from '../../services/patient-appointments.service';

@Component({
  selector: 'app-patient-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideDynamicIcon, LiveBadge],
  templateUrl: './patient-navbar.html',
  styleUrls: ['./patient-navbar.css']
})
export class PatientNavbarComponent {
  readonly MenuIcon = LucideMenu;
  readonly menu = inject(MenuService);
  readonly ChevronDownIcon = LucideChevronDown;
  readonly SunIcon = LucideSun;
  readonly MoonIcon = LucideMoon;
  readonly BellIcon = LucideBell;
  readonly UserIcon = LucideUser;

  readonly theme = inject(ThemeService);
  readonly mine = inject(PatientAppointmentsService);

  tagline = 'Your care, in one place';
}
