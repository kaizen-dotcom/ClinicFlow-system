import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AdminUiService } from '../../shared/services/admin-ui.service';
import { ClinicStore } from '../../shared/services/clinic-store.service';
import { Patient } from '../../shared/services/clinic.models';
import { downloadCsv } from '../../shared/utils/csv';
import { addDays, todayISO } from '../../shared/utils/time';

const PAGE_SIZE = 10;

type PatientForm = Pick<Patient, 'fullName' | 'email' | 'phone' | 'dob' | 'gender' | 'address'> & { id?: string };

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients.html',
  styleUrl: './patients.css'
})
export class PatientsComponent {
  readonly ui = inject(AdminUiService);
  private readonly clinic = inject(ClinicStore);

  readonly search = signal('');
  readonly status = signal<'' | 'Active' | 'Inactive'>('');
  readonly sort = signal<'newest' | 'oldest' | 'name'>('newest');
  readonly page = signal(1);

  /** Patient shown in the details panel, or null. */
  readonly viewingId = signal<string | null>(null);
  readonly viewing = computed(() => this.clinic.patients().find(p => p.id === this.viewingId()) ?? null);
  readonly viewingAppointments = computed(() =>
    this.clinic.appointments().filter(a => a.patientId === this.viewingId()).reverse()
  );

  /** Add/edit form; null when closed. */
  editing: PatientForm | null = null;
  formSubmitted = false;
  formError = '';
  message = '';

  readonly statCards = computed(() => {
    const all = this.clinic.patients();
    const since = addDays(todayISO(), -30);
    const inactive = all.filter(p => p.status === 'Inactive').length;
    return [
      { label: 'Registered patients', value: all.length, subtext: 'All patient records', isPositive: false },
      { label: 'New in the last 30 days', value: all.filter(p => p.registeredOn >= since).length, subtext: 'Online and front-desk sign-ups', isPositive: true },
      { label: 'Active patients', value: all.length - inactive, subtext: `${inactive} inactive record${inactive === 1 ? '' : 's'}`, isPositive: false }
    ];
  });

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.clinic.patients().filter(p =>
      (!this.status() || p.status === this.status()) &&
      (!q || p.fullName.toLowerCase().includes(q) || p.email.includes(q) || p.phone.includes(q) || p.id.toLowerCase().includes(q))
    );
    switch (this.sort()) {
      case 'name': return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
      case 'oldest': return [...list].sort((a, b) => a.registeredOn.localeCompare(b.registeredOn));
      default: return [...list].sort((a, b) => b.registeredOn.localeCompare(a.registeredOn));
    }
  });

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  readonly pageItems = computed(() => {
    const p = Math.min(this.page(), this.pageCount());
    return this.filtered().slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  });
  readonly rangeLabel = computed(() => {
    const total = this.filtered().length;
    const p = Math.min(this.page(), this.pageCount());
    return total ? `Showing ${(p - 1) * PAGE_SIZE + 1}–${Math.min(p * PAGE_SIZE, total)} of ${total} patients` : 'No patients';
  });

  visitCount(patientId: string): number {
    return this.clinic.appointments().filter(a => a.patientId === patientId && a.status === 'Completed').length;
  }

  setFilter(fn: () => void) {
    fn();
    this.page.set(1);
  }

  openAdd() {
    this.editing = { fullName: '', email: '', phone: '', dob: '', gender: 'Prefer not to say', address: '' };
    this.formSubmitted = false;
    this.formError = '';
  }

  openEdit(p: Patient) {
    this.editing = { id: p.id, fullName: p.fullName, email: p.email, phone: p.phone, dob: p.dob, gender: p.gender || 'Prefer not to say', address: p.address };
    this.formSubmitted = false;
    this.formError = '';
  }

  save(f: NgForm) {
    this.formSubmitted = true;
    this.formError = '';
    if (!this.editing || f.invalid) return;
    const e = this.editing;
    if (e.id) {
      const r = this.clinic.updatePatient(e.id, { fullName: e.fullName.trim(), email: e.email, phone: e.phone.trim(), dob: e.dob, gender: e.gender, address: e.address.trim() });
      if (!r.ok) { this.formError = r.error; return; }
      this.message = `${e.fullName} updated.`;
    } else {
      // Front-desk registration: a temporary password the patient changes at the desk / via reset.
      const r = this.clinic.registerPatient({ ...e, password: 'Welcome@123' });
      if (!r.ok) { this.formError = r.error; return; }
      this.message = `${e.fullName} registered as ${r.id}. Temporary password: Welcome@123`;
    }
    this.editing = null;
  }

  toggleStatus(p: Patient) {
    const next = p.status === 'Active' ? 'Inactive' : 'Active';
    this.clinic.updatePatient(p.id, { status: next });
    this.message = `${p.fullName} is now ${next.toLowerCase()}.`;
  }

  bookFor(p: Patient) {
    this.viewingId.set(null);
    this.ui.newAppointment(p.id);
  }

  exportCsv() {
    downloadCsv('patients.csv', [
      ['Patient ID', 'Name', 'Email', 'Phone', 'Date of birth', 'Gender', 'Registered', 'Status', 'Completed visits'],
      ...this.filtered().map(p => [p.id, p.fullName, p.email, p.phone, p.dob, p.gender, p.registeredOn, p.status, this.visitCount(p.id)])
    ]);
  }

  getStatusClass(status: string): string {
    return status === 'Active' ? 'badge-active' : 'badge-inactive';
  }

  apptClass(status: string): string {
    return 'badge-' + status.toLowerCase();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.editing = null;
    this.viewingId.set(null);
  }
}
