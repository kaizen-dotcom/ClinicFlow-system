import { LucidePlus, LucideX } from '@lucide/angular';
import { ToastService } from '../../shared/services/toast.service';
import { ChangeDetectorRef, Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClinicStore } from '../../shared/services/clinic-store.service';
import { Doctor } from '../../shared/services/clinic.models';
import { downloadCsv } from '../../shared/utils/csv';
import { to12h, todayISO } from '../../shared/utils/time';

type DoctorForm = Omit<Doctor, 'id'> & { id?: string };

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucidePlus, LucideX],
  templateUrl: './doctors.html',
  styleUrl: './doctors.css'
})
export class Doctors {
  readonly clinic = inject(ClinicStore);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly search = signal('');
  readonly specialty = signal('');
  readonly status = signal<'' | 'Active' | 'On leave'>('');

  editing: DoctorForm | null = null;
  formSubmitted = false;
  formError = '';
  saving = false;

  /** Today's working hours per doctor, from the schedule. */
  private readonly hoursToday = computed(() => {
    const today = todayISO();
    const map = new Map<string, string>();
    for (const b of this.clinic.schedules().filter(s => s.date === today).sort((a, b) => a.start.localeCompare(b.start))) {
      const label = `${to12h(b.start)} – ${to12h(b.end)}`;
      map.set(b.doctorId, map.has(b.doctorId) ? `${map.get(b.doctorId)}, ${label}` : label);
    }
    return map;
  });

  readonly statCards = computed(() => {
    const all = this.clinic.doctors();
    const active = all.filter(d => d.status === 'Active');
    return [
      { label: 'Total doctors', value: all.length, subtext: `Across ${this.clinic.specialties().length} specialties` },
      { label: 'Working today', value: active.filter(d => this.hoursToday().has(d.id)).length, subtext: 'With hours on today’s schedule' },
      { label: 'On leave', value: all.length - active.length, subtext: 'Not accepting appointments' }
    ];
  });

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    return this.clinic.doctors().filter(d =>
      (!this.specialty() || d.specialty === this.specialty()) &&
      (!this.status() || d.status === this.status()) &&
      (!q || d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q))
    );
  });

  hours(id: string): string {
    return this.hoursToday().get(id) ?? 'Not scheduled';
  }

  openAdd() {
    this.editing = {
      name: 'Dr. ', specialty: '', title: '', email: '', phone: '', experienceYears: 0,
      languages: '', location: '', bio: '', status: 'Active'
    };
    this.formSubmitted = false;
    this.formError = '';
  }

  openEdit(d: Doctor) {
    this.editing = { ...d };
    this.formSubmitted = false;
    this.formError = '';
  }

  async save(f: NgForm) {
    this.formSubmitted = true;
    this.formError = '';
    if (!this.editing || f.invalid || this.saving) return;
    const doctor = { ...this.editing, name: this.editing.name.trim(), specialty: this.editing.specialty.trim() };
    const goingOnLeave = doctor.status === 'On leave' && !!doctor.id && this.clinic.doctor(doctor.id)?.status === 'Active';
    if (goingOnLeave && !this.confirmLeave(doctor.id!, doctor.name)) return;
    this.saving = true;
    const r = await this.clinic.saveDoctor(doctor);
    if (r.ok) {
      this.toast.success(doctor.id
        ? `${doctor.name} updated.`
        : `${doctor.name} added. Add their working hours under Schedules so patients can book.`);
      this.editing = null;
    } else {
      this.formError = r.error;
    }
    this.saving = false;
    this.cdr.markForCheck();
  }

  async toggleLeave(d: Doctor) {
    const status = d.status === 'Active' ? 'On leave' : 'Active';
    if (status === 'On leave' && !this.confirmLeave(d.id, d.name)) return;
    const r = await this.clinic.saveDoctor({ ...d, status });
    if (!r.ok) this.toast.error(r.error);
    else this.toast.success(status === 'On leave'
      ? `${d.name} is on leave and hidden from booking. Affected patients have been notified.`
      : `${d.name} is available for booking again.`);
    this.cdr.markForCheck();
  }

  /** Warns about the visits affected before a doctor is put on leave. */
  private confirmLeave(id: string, name: string): boolean {
    const upcoming = this.clinic.upcomingFor(id);
    const list = upcoming.slice(0, 5).map(a => `• ${a.date} ${a.start} ${a.patient}`).join('\n');
    const affected = upcoming.length
      ? `${upcoming.length} upcoming appointment(s) are affected and those patients will be notified:\n${list}` +
        (upcoming.length > 5 ? '\n…' : '') + '\nThe appointments are kept, so reschedule or cancel them as needed.'
      : 'There are no upcoming appointments.';
    return confirm(`Set ${name} on leave?\n\n${affected}`);
  }

  exportCsv() {
    downloadCsv('doctors.csv', [
      ['ID', 'Name', 'Specialty', 'Email', 'Phone', 'Room', 'Experience (years)', 'Status', "Today's hours"],
      ...this.filtered().map(d => [d.id, d.name, d.specialty, d.email, d.phone, d.location, d.experienceYears, d.status, this.hours(d.id)])
    ]);
  }

  getStatusClass(status: string): string {
    return status === 'Active' ? 'badge-active' : 'badge-inactive';
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.editing = null;
  }
}
