import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon, LucideBell, LucideChevronDown } from '@lucide/angular';
import { ClinicStore } from '../../services/clinic-store.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideDynamicIcon],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent {
  readonly BellIcon = LucideBell;
  readonly ChevronDownIcon = LucideChevronDown;

  readonly clinic = inject(ClinicStore);
  readonly today = new Date();
  readonly pendingCount = computed(() => this.clinic.appointments().filter(a => a.status === 'Pending').length);
}
