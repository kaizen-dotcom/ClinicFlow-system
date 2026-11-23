import { Component, HostListener, computed, inject, signal } from '@angular/core';
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
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './doctors.html',
  styleUrl: './doctors.css'
})
export class Doctors {
  readonly clinic = inject(ClinicStore);

  readonly search = signal('');
  readonly specialty = signal('');
  readonly status = signal<'' | 'Active' | 'On leave'>('');

  editing: DoctorForm | null = null;
  formSubmitted = false;
  formError = '';
  message = '';

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
      languages: 'English', location: '', bio: '', status: 'Active'
    };
    this.formSubmitted = false;
    this.formError = '';
  }

  openEdit(d: Doctor) {
    this.editing = { ...d };
    this.formSubmitted = false;
    this.formError = '';
  }

  save(f: NgForm) {
    this.formSubmitted = true;
    this.formError = '';
    if (!this.editing || f.invalid) return;
    const isNew = !this.editing.id;
    const r = this.clinic.saveDoctor({ ...this.editing, name: this.editing.name.trim(), specialty: this.editing.specialty.trim() });
    if (!r.ok) { this.formError = r.error; return; }
    this.message = isNew
      ? `${this.editing.name} added. Add their working hours under Schedules so patients can book.`
      : `${this.editing.name} updated.`;
    this.editing = null;
  }

  toggleLeave(d: Doctor) {
    const status = d.status === 'Active' ? 'On leave' : 'Active';
    this.clinic.saveDoctor({ ...d, status });
    this.message = status === 'On leave'
      ? `${d.name} is on leave and hidden from booking. Existing appointments are unchanged.`
      : `${d.name} is available for booking again.`;
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
