import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon, LucideArrowRight } from '@lucide/angular';
import { BookingModalService } from '../../shared/services/booking-modal.service';
import { PatientAppointmentsService } from '../../shared/services/patient-appointments.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideDynamicIcon],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  readonly ArrowRightIcon = LucideArrowRight;

  readonly booking = inject(BookingModalService);
  readonly store = inject(PatientAppointmentsService);

  get patientName(): string {
    return this.store.patient.fullName.split(' ')[0];
  }

  /** Soonest approved visit, or else the soonest pending one. */
  readonly nextVisit = computed(() => {
    const upcoming = this.store.appointments().filter(a => this.store.isUpcoming(a));
    return upcoming.find(a => a.status === 'Approved') ?? upcoming[0] ?? null;
  });

  readonly stats = computed(() => {
    const all = this.store.appointments();
    const count = (status: string) => String(all.filter(a => a.status === status).length).padStart(2, '0');
    return [
      { value: count('Approved'), label: 'Upcoming visit' },
      { value: count('Pending'), label: 'Pending request' },
      { value: count('Completed'), label: 'Completed visits' }
    ];
  });

  readonly recentActivity = computed(() => this.store.appointments().slice(0, 3));

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved': return 'badge-approved';
      case 'pending': return 'badge-pending';
      default: return 'badge-default';
    }
  }
}
