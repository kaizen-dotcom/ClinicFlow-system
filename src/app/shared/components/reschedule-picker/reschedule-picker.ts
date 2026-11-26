import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef, Component, OnInit, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClinicStore } from '../../services/clinic-store.service';
import { AppointmentView, Slot } from '../../services/clinic.models';

/** Picks a new date and time with the same doctor. */
@Component({
  selector: 'app-reschedule-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h3 class="cf-section-title">Choose a new time with {{ appointment().doctor }}</h3>
    @if (!dates.length) {
      <p class="cf-alert cf-alert-info">There are no open slots in the next 60 days.</p>
    } @else {
      <div class="cf-chips" role="group" aria-label="Date">
        @for (d of dates; track d) {
          <button type="button" class="cf-chip" [class.selected]="date === d" [attr.aria-pressed]="date === d"
                  (click)="selectDate(d)">{{ d | date: 'EEE d MMM' }}</button>
        }
      </div>
      <div class="cf-chips" role="group" aria-label="Time">
        @for (s of slots; track s.time) {
          <button type="button" class="cf-chip" [class.selected]="time === s.time" [attr.aria-pressed]="time === s.time"
                  [disabled]="!s.available" (click)="time = s.time">{{ s.label }}</button>
        }
      </div>
    }
    @if (error) { <p class="cf-alert cf-alert-error" role="alert">{{ error }}</p> }
    <div class="cf-actions">
      <button type="button" class="btn-secondary" (click)="cancelled.emit()">Back</button>
      <button type="button" class="btn-primary" [disabled]="!time || busy" [class.is-busy]="busy" (click)="save()">{{ confirmLabel() }}</button>
    </div>
  `,
  styles: [`:host { display: flex; flex-direction: column; gap: 12px; }`]
})
export class ReschedulePicker implements OnInit {
  private readonly clinic = inject(ClinicStore);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly appointment = input.required<AppointmentView>();
  readonly confirmLabel = input('Save new time');
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  dates: string[] = [];
  slots: Slot[] = [];
  date = '';
  time = '';
  error = '';
  busy = false;

  ngOnInit(): void {
    this.dates = this.clinic.availableDates(this.appointment().doctorId, 10);
    this.selectDate(this.dates[0] ?? '');
  }

  selectDate(date: string): void {
    this.date = date;
    this.time = '';
    this.slots = date ? this.clinic.slotsFor(this.appointment().doctorId, date) : [];
  }

  async save(): Promise<void> {
    if (this.busy || !this.time) return;
    this.busy = true;
    this.error = '';
    const result = await this.clinic.reschedule(this.appointment().id, this.date, this.time);
    this.busy = false;
    if (result.ok) {
      this.saved.emit();
      this.toast.success('New time saved.');
    } else {
      this.error = result.error;
      this.selectDate(this.date); // the slot may have just been taken
    }
    this.cdr.markForCheck();
  }
}
