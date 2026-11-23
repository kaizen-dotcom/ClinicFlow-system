import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminUiService } from '../../shared/services/admin-ui.service';
import { ClinicStore } from '../../shared/services/clinic-store.service';
import { addDays, startOfWeek, todayISO } from '../../shared/utils/time';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  readonly ui = inject(AdminUiService);
  private readonly clinic = inject(ClinicStore);

  readonly today = todayISO();
  message = '';

  readonly todaysAppointments = computed(() =>
    this.clinic.appointments().filter(a => a.date === this.today && a.status !== 'Rejected')
  );

  readonly pendingRequests = computed(() => this.clinic.appointments().filter(a => a.status === 'Pending'));

  readonly statCards = computed(() => {
    const all = this.clinic.appointments();
    const today = this.todaysAppointments();
    const weekStart = startOfWeek(this.today);
    const doctorsWithHoursToday = new Set(this.clinic.schedules().filter(s => s.date === this.today).map(s => s.doctorId));
    const active = this.clinic.activeDoctors();
    const patients = this.clinic.patients();
    const newThisWeek = patients.filter(p => p.registeredOn >= weekStart).length;
    return [
      { label: "Today's appointments", value: today.length,
        subtext: `${today.filter(a => a.status === 'Completed').length} completed · ${today.filter(a => a.status === 'Approved').length} upcoming`, isPositive: false },
      { label: 'Pending requests', value: this.pendingRequests().length,
        subtext: this.pendingRequests().length ? 'Needs your review' : 'All caught up', isPositive: !this.pendingRequests().length },
      { label: 'Doctors working today', value: active.filter(d => doctorsWithHoursToday.has(d.id)).length,
        subtext: `of ${this.clinic.doctors().length} doctors`, isPositive: false },
      { label: 'Registered patients', value: patients.length,
        subtext: `+${newThisWeek} this week · ${all.filter(a => a.date >= weekStart && a.date < addDays(weekStart, 7)).length} visits this week`, isPositive: newThisWeek > 0 }
    ];
  });

  /** Latest status changes across all appointments. */
  readonly recentActivity = computed(() =>
    this.clinic.appointments()
      .flatMap(a => a.history.map(h => ({ ...h, appointment: a })))
      .sort((x, y) => y.date.localeCompare(x.date))
      .slice(0, 5)
  );

  approve(id: string) {
    const r = this.clinic.approve(id);
    this.message = r.ok ? `${id} approved. The patient has been notified.` : r.error;
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed': return 'badge-completed';
      case 'approved': return 'badge-approved';
      case 'pending': return 'badge-pending';
      default: return 'badge-gray';
    }
  }
}
