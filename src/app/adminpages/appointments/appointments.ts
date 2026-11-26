import { ToastService } from '../../shared/services/toast.service';
import { ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminUiService } from '../../shared/services/admin-ui.service';
import { AppointmentView, ClinicStore } from '../../shared/services/clinic-store.service';
import { APPOINTMENT_STATUSES, AppointmentStatus } from '../../shared/services/clinic.models';
import { downloadCsv } from '../../shared/utils/csv';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments.html',
  styleUrls: ['./appointments.css']
})
export class AppointmentsComponent {
  readonly ui = inject(AdminUiService);
  readonly clinic = inject(ClinicStore);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly status = signal<AppointmentStatus | 'All'>('All');
  readonly search = signal('');
  readonly doctorId = signal('');
  readonly month = signal('');   // "YYYY-MM" or ''
  readonly page = signal(1);
  /** Appointment being approved, to show progress on its button. */
  approving = '';

  constructor() {
    const s = inject(ActivatedRoute).snapshot.queryParamMap.get('status') as AppointmentStatus | null;
    if (s && APPOINTMENT_STATUSES.includes(s)) this.status.set(s);
  }

  /** Months that have appointments, newest first. */
  readonly months = computed(() =>
    [...new Set(this.clinic.appointments().map(a => a.date.slice(0, 7)))].sort().reverse()
  );

  /** Appointments matching search, doctor and month (before the status tab). */
  private readonly base = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.clinic.appointments().filter(a =>
      (!this.doctorId() || a.doctorId === this.doctorId()) &&
      (!this.month() || a.date.startsWith(this.month())) &&
      (!q || a.patient.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.patientId.toLowerCase().includes(q))
    );
  });

  readonly tabs = computed(() => [
    { label: 'All', value: 'All' as const, count: this.base().length },
    ...APPOINTMENT_STATUSES.map(s => ({ label: s, value: s, count: this.base().filter(a => a.status === s).length }))
  ]);

  /** Pending first (oldest request first), then by date. */
  readonly filtered = computed(() => {
    const list = this.status() === 'All' ? this.base() : this.base().filter(a => a.status === this.status());
    return [...list].sort((a, b) =>
      (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1) || (b.date + b.time).localeCompare(a.date + a.time)
    );
  });

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly pageItems = computed(() => {
    const p = Math.min(this.page(), this.pageCount());
    return this.filtered().slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  });
  readonly rangeLabel = computed(() => {
    const total = this.filtered().length;
    if (!total) return 'No appointments';
    const p = Math.min(this.page(), this.pageCount());
    return `Showing ${(p - 1) * PAGE_SIZE + 1}–${Math.min(p * PAGE_SIZE, total)} of ${total} appointments`;
  });

  readonly statCards = computed(() => {
    const all = this.clinic.appointments();
    const count = (s: AppointmentStatus) => all.filter(a => a.status === s).length;
    return [
      { label: 'Total appointments', value: all.length, subtext: `${count('Completed')} completed` },
      { label: 'Pending', value: count('Pending'), subtext: count('Pending') ? 'Need review' : 'All caught up' },
      { label: 'Approved', value: count('Approved'), subtext: 'Confirmed upcoming visits' },
      { label: 'Cancelled / rejected', value: count('Cancelled') + count('Rejected'), subtext: 'Will not take place' }
    ];
  });

  setFilter(fn: () => void) {
    fn();
    this.page.set(1);
  }

  reset() {
    this.search.set('');
    this.doctorId.set('');
    this.month.set('');
    this.status.set('All');
    this.page.set(1);
  }

  async approve(a: AppointmentView) {
    if (this.approving) return;
    this.approving = a.id;
    const r = await this.clinic.approve(a.id);
    this.approving = '';
    if (r.ok) this.toast.success(`${a.id} approved. ${a.patient} has been notified.`);
    else this.toast.error(r.error);
    this.cdr.markForCheck();
  }

  exportCsv() {
    downloadCsv('appointments.csv', [
      ['Appointment', 'Patient ID', 'Patient', 'Doctor', 'Specialty', 'Date', 'Time', 'Type', 'Status', 'Reason'],
      ...this.filtered().map(a => [a.id, a.patientId, a.patient, a.doctor, a.specialty, a.date, a.start, a.type, a.status, a.reason])
    ]);
  }

  getStatusClass(status: string): string {
    return 'badge-' + status.toLowerCase();
  }
}
