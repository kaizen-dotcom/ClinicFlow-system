import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon, LucideChevronDown, LucideMenu } from '@lucide/angular';
import { AdminNotifications } from '../admin-notifications/admin-notifications';
import { MenuService } from '../../services/menu.service';
import { LiveBadge } from '../live-badge/live-badge';
import { ClinicStore } from '../../services/clinic-store.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideDynamicIcon, LiveBadge, AdminNotifications],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent {
  readonly MenuIcon = LucideMenu;
  readonly menu = inject(MenuService);
  readonly ChevronDownIcon = LucideChevronDown;

  readonly clinic = inject(ClinicStore);
  readonly today = new Date();
}
