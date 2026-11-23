import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon, LucideArrowRight } from '@lucide/angular';
import { RouterModule } from '@angular/router';
import { BookingModalService } from '../../shared/services/booking-modal.service';
import { PatientAppointmentsService } from '../../shared/services/patient-appointments.service';

type Tab = 'all' | 'upcoming' | 'previous';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideDynamicIcon],
  templateUrl: './appointments.html',
  styleUrl: './appointments.css'
})
export class MyAppointments {
  readonly ArrowRightIcon = LucideArrowRight;

  readonly booking = inject(BookingModalService);
  readonly store = inject(PatientAppointmentsService);

  private readonly tab = signal<Tab>('all');
  get activeTab(): Tab { return this.tab(); }

  private readonly upcoming = computed(() => this.store.appointments().filter(a => this.store.isUpcoming(a)));
  private readonly previous = computed(() => this.store.appointments().filter(a => !this.store.isUpcoming(a)));

  readonly tabs = computed(() => [
    { label: 'All appointments', value: 'all' as Tab, count: null },
    { label: 'Upcoming', value: 'upcoming' as Tab, count: this.upcoming().length },
    { label: 'Previous', value: 'previous' as Tab, count: this.previous().length }
  ]);

  readonly visible = computed(() => {
    switch (this.tab()) {
      case 'upcoming': return this.upcoming();
      case 'previous': return this.previous();
      default: return this.store.appointments();
    }
  });

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved': return 'badge-approved';
      case 'pending': return 'badge-pending';
      case 'completed': return 'badge-completed';
      case 'rejected': return 'badge-rejected';
      case 'cancelled': return 'badge-cancelled';
      default: return 'badge-default';
    }
  }

  setTab(tab: Tab) {
    this.tab.set(tab);
  }
}
