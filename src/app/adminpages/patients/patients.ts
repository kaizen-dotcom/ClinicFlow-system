import { LucidePlus, LucideChevronLeft, LucideChevronRight, LucideX } from '@lucide/angular';
import { ToastService } from '../../shared/services/toast.service';
import { ChangeDetectorRef, Component, HostListener, computed, inject, signal } from '@angular/core';
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
  imports: [CommonModule, FormsModule, LucidePlus, LucideChevronLeft, LucideChevronRight, LucideX],
  templateUrl: './patients.html',
  styleUrl: './patients.css'
})
export class PatientsComponent {
  readonly ui = inject(AdminUiService);
  private readonly clinic = inject(ClinicStore);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

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
  saving = false;
  message = '';
  /** Result of an action taken inside the details window. */
  panelMessage = '';

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

  async save(f: NgForm) {
    this.formSubmitted = true;
    this.formError = '';
    if (!this.editing || f.invalid || this.saving) return;
    const { id, ...fields } = this.editing;
    const input = { ...fields, fullName: fields.fullName.trim(), phone: fields.phone.trim(), address: fields.address.trim() };
    this.saving = true;
    if (id) {
      const r = await this.clinic.updatePatient(id, input);
      if (r.ok) {
        this.toast.success(`${input.fullName} updated.`);
        this.editing = null;
      } else {
        this.formError = r.error;
      }
    } else {
      // Front-desk registration: the server creates a temporary password to give to the patient.
      const r = await this.clinic.createPatient(input);
      if (r.ok) {
        this.toast.success(`${input.fullName} registered.`);
        // Stays on the page so it can be copied.
        this.message = `${input.fullName} registered as ${r.id}. Temporary password (shown only once): ${r.temporaryPassword}`;
        this.editing = null;
      } else {
        this.formError = r.error;
      }
    }
    this.saving = false;
    this.cdr.markForCheck();
  }

  async toggleStatus(p: Patient) {
    const next = p.status === 'Active' ? 'Inactive' : 'Active';
    if (next === 'Inactive' && !confirm(`Deactivate ${p.fullName}? They are signed out and can't log in or book until reactivated.`)) return;
    const r = await this.clinic.setPatientStatus(p.id, next);
    if (r.ok) this.toast.success(`${p.fullName} is now ${next.toLowerCase()}.`);
    else this.toast.error(r.error);
    this.cdr.markForCheck();
  }

  view(id: string) {
    this.panelMessage = '';
    this.viewingId.set(id);
  }

  async resetPassword(p: Patient) {
    if (!confirm(`Reset the password for ${p.fullName}? Their current password will stop working.`)) return;
    const r = await this.clinic.resetPatientPassword(p.id);
    if (r.ok) {
      this.panelMessage = `Temporary password (shown only once): ${r.temporaryPassword}. Ask the patient to change it under My profile.`;
    } else {
      this.toast.error(r.error);
    }
    this.cdr.markForCheck();
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
