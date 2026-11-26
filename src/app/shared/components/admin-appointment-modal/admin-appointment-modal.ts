import { LucideX } from '@lucide/angular';
import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef, Component, HostListener, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUiService } from '../../services/admin-ui.service';
import { ClinicStore, Result } from '../../services/clinic-store.service';
import { hasStarted } from '../../utils/time';
import { ReschedulePicker } from '../reschedule-picker/reschedule-picker';

type Mode = 'view' | 'approve' | 'reject' | 'cancel' | 'complete' | 'noshow' | 'reschedule';

/** Admin review of one appointment: details plus approve / reject / cancel / complete. */
@Component({
  selector: 'app-admin-appointment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReschedulePicker, LucideX],
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
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly appt = computed(() => this.clinic.appointments().find(a => a.id === this.ui.reviewingId()) ?? null);
  readonly patient = computed(() => { const a = this.appt(); return a ? this.clinic.patient(a.patientId) : undefined; });

  mode: Mode = 'view';
  text = '';
  error = '';
  done = '';
  busy = false;

  /** Whether the visit's start time has arrived (decides which actions are possible). */
  started(): boolean {
    const a = this.appt();
    return !!a && hasStarted(a.date, a.time);
  }

  rescheduled(): void {
    this.reset();
    this.done = 'Appointment moved to the new time and approved. The patient has been notified.';
  }

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

  async confirm(): Promise<void> {
    const a = this.appt();
    const mode = this.mode;
    if (!a || mode === 'view' || mode === 'reschedule' || this.busy) return;
    this.busy = true;
    const actions: Record<Exclude<Mode, 'view' | 'reschedule'>, () => Promise<Result>> = {
      approve: () => this.clinic.approve(a.id, this.text),
      reject: () => this.clinic.reject(a.id, this.text),
      cancel: () => this.clinic.cancel(a.id, this.text),
      complete: () => this.clinic.complete(a.id, this.text),
      noshow: () => this.clinic.markNoShow(a.id, this.text)
    };
    const result = await actions[mode]();
    this.busy = false;
    this.cdr.markForCheck();
    // The admin may have closed this appointment while the request was running.
    if (this.ui.reviewingId() !== a.id) return;
    if (!result.ok) { this.error = result.error; return; }
    const verb = { approve: 'approved', reject: 'rejected', cancel: 'cancelled', complete: 'marked as completed', noshow: 'marked as a no-show' }[mode];
    this.reset();
    this.done = `Appointment ${verb}. The patient has been notified.`;
    this.toast.success(`${a.id} ${verb}.`);
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
