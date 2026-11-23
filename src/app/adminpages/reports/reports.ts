import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicStore } from '../../shared/services/clinic-store.service';
import { APPOINTMENT_STATUSES } from '../../shared/services/clinic.models';
import { downloadCsv } from '../../shared/utils/csv';
import { todayISO } from '../../shared/utils/time';

const STATUS_COLORS: Record<string, string> = {
  Completed: '#138A4B', Approved: '#3B82F6', Pending: '#F59E0B', Cancelled: '#64748B', Rejected: '#EF4444'
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class Reports {
  readonly clinic = inject(ClinicStore);

  readonly month = signal(todayISO().slice(0, 7));   // "YYYY-MM"
  readonly doctorId = signal('');
  readonly specialty = signal('');

  readonly months = computed(() =>
    [...new Set([todayISO().slice(0, 7), ...this.clinic.appointments().map(a => a.date.slice(0, 7))])].sort().reverse()
  );

  /** Appointments in the selected month matching the doctor/specialty filters. */
  readonly rows = computed(() =>
    this.clinic.appointments().filter(a =>
      a.date.startsWith(this.month()) &&
      (!this.doctorId() || a.doctorId === this.doctorId()) &&
      (!this.specialty() || a.specialty === this.specialty())
    )
  );

  readonly statCards = computed(() => {
    const r = this.rows();
    const n = (s: string) => r.filter(a => a.status === s).length;
    const decided = n('Approved') + n('Completed') + n('Rejected');
    return [
      { label: 'Total appointments', value: r.length },
      { label: 'Completed', value: n('Completed') },
      { label: 'Cancelled', value: n('Cancelled') },
      { label: 'Pending review', value: n('Pending') },
      { label: 'Approval rate', value: decided ? Math.round(((decided - n('Rejected')) / decided) * 100) + '%' : '—' }
    ];
  });

  /** One bar per day of the month. */
  readonly bars = computed(() => {
    const [y, m] = this.month().split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const counts = Array.from({ length: daysInMonth }, (_, i) => {
      const day = `${this.month()}-${String(i + 1).padStart(2, '0')}`;
      return this.rows().filter(a => a.date === day).length;
    });
    const max = Math.max(4, ...counts);
    const top = Math.ceil(max / 4) * 4;
    return {
      top,
      axis: [top, (top * 3) / 4, top / 2, top / 4, 0],
      items: counts.map((count, i) => ({ day: i + 1, count, height: (count / top) * 100 + '%', showLabel: i === 0 || (i + 1) % 5 === 0 }))
    };
  });

  readonly statusData = computed(() => {
    const total = this.rows().length;
    return APPOINTMENT_STATUSES.map(s => {
      const count = this.rows().filter(a => a.status === s).length;
      const pct = total ? (count / total) * 100 : 0;
      return { label: s, count, percent: pct.toFixed(1) + '%', color: STATUS_COLORS[s] };
    });
  });

  readonly doctorsSummary = computed(() =>
    this.clinic.doctors()
      .map(d => {
        const r = this.rows().filter(a => a.doctorId === d.id);
        const completed = r.filter(a => a.status === 'Completed').length;
        const approved = r.filter(a => a.status === 'Approved').length;
        return { doctor: d.name, specialty: d.specialty, total: r.length, completed, approved, other: r.length - completed - approved };
      })
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)
  );

  exportReport() {
    downloadCsv(`clinicflow-report-${this.month()}.csv`, [
      ['Report month', this.month()],
      [],
      ['Doctor', 'Specialty', 'Total', 'Completed', 'Approved', 'Other statuses'],
      ...this.doctorsSummary().map(d => [d.doctor, d.specialty, d.total, d.completed, d.approved, d.other]),
      [],
      ['Status', 'Count', 'Share'],
      ...this.statusData().map(s => [s.label, s.count, s.percent]),
      [],
      ['Appointment', 'Date', 'Time', 'Patient', 'Doctor', 'Type', 'Status'],
      ...this.rows().map(a => [a.id, a.date, a.start, a.patient, a.doctor, a.type, a.status])
    ]);
  }
}
