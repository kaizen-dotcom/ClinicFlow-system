import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideDynamicIcon, LucideArrowRight } from '@lucide/angular';
import { BookingModalService } from '../../shared/services/booking-modal.service';
import { ClinicStore } from '../../shared/services/clinic-store.service';
import { PatientAppointmentsService } from '../../shared/services/patient-appointments.service';
import { PatientNotification } from '../../shared/services/clinic.models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class Notifications {
  readonly ArrowRightIcon = LucideArrowRight;

  private readonly router = inject(Router);
  private readonly booking = inject(BookingModalService);
  private readonly clinic = inject(ClinicStore);
  readonly mine = inject(PatientAppointmentsService);

  readonly activeTab = signal<'all' | 'unread'>('all');

  readonly visible = computed(() =>
    this.activeTab() === 'unread' ? this.mine.notifications().filter(n => !n.read) : this.mine.notifications()
  );

  setTab(tab: 'all' | 'unread') {
    this.activeTab.set(tab);
  }

  markAllAsRead() {
    this.clinic.markAllRead(this.mine.patient.id);
  }

  label(n: PatientNotification): string {
    switch (n.action.kind) {
      case 'view-appointment': return 'View appointment';
      case 'view-doctor': return 'View schedule';
      default: return n.type === 'REJECTION' ? 'Find another time' : 'Book a new visit';
    }
  }

  /** Runs a notification's action and marks it as read. */
  open(n: PatientNotification) {
    this.clinic.markRead(n.id);
    const action = n.action;
    switch (action.kind) {
      case 'view-appointment':
        this.mine.view(action.appointmentId);
        break;
      case 'view-doctor':
        this.router.navigate(['/patient/doctor-details', action.doctorId]);
        break;
      case 'book':
        this.booking.open(action.doctorId);
        break;
    }
  }
}
