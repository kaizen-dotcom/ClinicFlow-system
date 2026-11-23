import { Component, HostListener, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUiService } from '../../services/admin-ui.service';
import { ClinicStore, Result } from '../../services/clinic-store.service';

type Mode = 'view' | 'approve' | 'reject' | 'cancel' | 'complete';

/** Admin review of one appointment: details plus approve / reject / cancel / complete. */
@Component({
  selector: 'app-admin-appointment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-appointment-modal.html',
  styles: [`
    .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .badge-pending { background: var(--badge-amber-bg); color: var(--badge-amber-text); }
    .badge-approved { background: var(--badge-blue-bg); color: var(--badge-blue-text); }
    .badge-completed { background: var(--badge-green-bg); color: var(--badge-green-text); }
    .badge-rejected { background: var(--badge-red-bg); color: var(--badge-red-text); }
    .badge-cancelled { background: var(--badge-gray-bg); color: var(--badge-gray-text); }
  `]
})
export class AdminAppointmentModal {
  readonly ui = inject(AdminUiService);
  readonly clinic = inject(ClinicStore);

  readonly appt = computed(() => this.clinic.appointments().find(a => a.id === this.ui.reviewingId()) ?? null);
  readonly patient = computed(() => { const a = this.appt(); return a ? this.clinic.patient(a.patientId) : undefined; });

  mode: Mode = 'view';
  text = '';
  error = '';
  done = '';

  constructor() {
    effect(() => {
      this.ui.reviewingId();
      this.reset();
    });
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.text = '';
    this.error = '';
    this.done = '';
  }

  confirm(): void {
    const a = this.appt();
    if (!a) return;
    let result: Result;
    switch (this.mode) {
      case 'approve': result = this.clinic.approve(a.id, this.text); break;
      case 'reject': result = this.clinic.reject(a.id, this.text); break;
      case 'cancel': result = this.clinic.cancel(a.id, 'clinic', this.text); break;
      case 'complete': result = this.clinic.complete(a.id, this.text); break;
      default: return;
    }
    if (!result.ok) { this.error = result.error; return; }
    const verb = { approve: 'approved', reject: 'rejected', cancel: 'cancelled', complete: 'marked as completed' }[this.mode];
    this.reset();
    this.done = `Appointment ${verb}. The patient has been notified.`;
  }

  close(): void {
    this.ui.closeReview();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.ui.reviewingId()) this.close();
  }

  private reset(): void {
    this.mode = 'view';
    this.text = '';
    this.error = '';
    this.done = '';
  }
}
