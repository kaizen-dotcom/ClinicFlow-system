import { ToastService } from '../../shared/services/toast.service';
import { ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LucideDynamicIcon, LucideCalendarDays, LucideChevronDown, LucideChevronLeft, LucideChevronRight, LucideStethoscope } from '@lucide/angular';
import { ClinicStore } from '../../shared/services/clinic-store.service';
import { ScheduleBlock } from '../../shared/services/clinic.models';
import { addDays, addWeekdays, isWeekend, minutes, startOfWeek, to12h, todayISO } from '../../shared/utils/time';

/** Calendar shows 08:00–18:00 in 30-minute rows. */
const DAY_START = 8 * 60;
const DAY_END = 18 * 60;
const ROW_MIN = 30;

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './schedules.html',
  styleUrl: './schedules.css'
})
export class Schedules {
  readonly clinic = inject(ClinicStore);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly StethoscopeIcon = LucideStethoscope;
  readonly ChevronDownIcon = LucideChevronDown;
  readonly ChevronLeftIcon = LucideChevronLeft;
  readonly ChevronRightIcon = LucideChevronRight;
  readonly CalendarIcon = LucideCalendarDays;

  readonly hours = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => 8 + i);
  readonly rowCount = (DAY_END - DAY_START) / ROW_MIN;
  readonly slotOptions = [15, 20, 30, 45, 60];

  readonly doctorId = signal('');
  readonly weekStart = signal(startOfWeek(todayISO()));
  readonly selectedBlockId = signal<number | null>(null);

  form = {
    doctorId: '',
    date: addWeekdays(todayISO(), 0),
    start: '09:00',
    end: '12:00',
    slotMinutes: 30,
    repeat: false,
    repeatWeeks: 4
  };
  formError = '';
  saving = false;

  constructor() {
    const fromQuery = inject(ActivatedRoute).snapshot.queryParamMap.get('doctor');
    const first = this.clinic.activeDoctors()[0]?.id ?? this.clinic.doctors()[0]?.id ?? '';
    const id = fromQuery && this.clinic.doctor(fromQuery) ? fromQuery : first;
    this.doctorId.set(id);
    this.form.doctorId = id;
  }

  readonly doctor = computed(() => this.clinic.doctor(this.doctorId()));

  readonly days = computed(() => Array.from({ length: 5 }, (_, i) => addDays(this.weekStart(), i)));

  /** Blocks for the selected doctor in the visible week, with booking counts and grid placement. */
  readonly blocks = computed(() => {
    const days = this.days();
    this.clinic.appointments(); // recount when bookings change
    return this.clinic.schedules()
      .filter(b => b.doctorId === this.doctorId() && days.includes(b.date))
      .map(b => {
        const slots = this.clinic.slotsFor(b.doctorId, b.date)
          .filter(s => minutes(s.time) >= minutes(b.start) && minutes(s.time) < minutes(b.end));
        const booked = slots.filter(s => s.booked).length;
        const startRow = Math.max(0, (minutes(b.start) - DAY_START) / ROW_MIN) + 1;
        const span = Math.max(1, (Math.min(minutes(b.end), DAY_END) - Math.max(minutes(b.start), DAY_START)) / ROW_MIN);
        return {
          ...b, total: slots.length, booked,
          type: booked === 0 ? 'available' : booked < slots.length ? 'partial' : 'full',
          title: `${to12h(b.start)} – ${to12h(b.end)}`,
          gridRow: `${startRow} / span ${span}`,
          gridColumn: days.indexOf(b.date) + 1
        };
      });
  });

  readonly selectedBlock = computed(() => this.blocks().find(b => b.id === this.selectedBlockId()) ?? null);

  readonly bookedInSelected = computed(() => {
    const b = this.selectedBlock();
    if (!b) return [];
    return this.clinic.appointments().filter(a =>
      a.doctorId === b.doctorId && a.date === b.date && (a.status === 'Pending' || a.status === 'Approved') &&
      minutes(a.time) >= minutes(b.start) && minutes(a.time) < minutes(b.end));
  });

  get slotPreview(): number {
    const span = minutes(this.form.end) - minutes(this.form.start);
    const perDay = span > 0 ? Math.floor(span / this.form.slotMinutes) : 0;
    return perDay * (this.form.repeat ? this.form.repeatWeeks + 1 : 1);
  }

  selectDoctor(id: string) {
    this.doctorId.set(id);
    this.form.doctorId = id;
    this.selectedBlockId.set(null);
  }

  moveWeek(weeks: number) {
    this.weekStart.set(addDays(this.weekStart(), weeks * 7));
    this.selectedBlockId.set(null);
  }

  goToday() {
    this.weekStart.set(startOfWeek(todayISO()));
    this.selectedBlockId.set(null);
  }

  async createSchedule() {
    if (this.saving) return;
    this.formError = '';
    if (!this.form.doctorId || !this.form.date || !this.form.start || !this.form.end) {
      this.formError = 'Fill in the doctor, date and hours.';
      return;
    }
    if (isWeekend(this.form.date)) {
      this.formError = 'The clinic is open Monday to Friday. Choose a weekday.';
      return;
    }
    if (minutes(this.form.start) < DAY_START || minutes(this.form.end) > DAY_END) {
      this.formError = 'Opening hours are 8:00 AM – 6:00 PM.';
      return;
    }
    const { doctorId, date, start, end } = this.form;
    this.saving = true;
    const r = await this.clinic.addAvailability({
      doctorId, date, start, end,
      slotMinutes: Number(this.form.slotMinutes), repeatWeeks: this.form.repeat ? Number(this.form.repeatWeeks) : 0
    });
    this.saving = false;
    this.cdr.markForCheck();
    if (!r.ok) { this.formError = r.error; return; }
    this.toast.success(`Added ${r.created} day${r.created === 1 ? '' : 's'} of availability` +
      (r.skipped ? ` (${r.skipped} skipped because they overlap existing hours).` : '.'));
    // Show the week of the first new block for that doctor.
    this.doctorId.set(doctorId);
    this.weekStart.set(startOfWeek(date));
  }

  async removeSelected() {
    const b = this.selectedBlock();
    if (!b) return;
    const r = await this.clinic.removeAvailability(b.id);
    if (r.ok) {
      this.toast.success('Availability removed.');
      this.selectedBlockId.set(null);
    } else {
      this.toast.error(r.error);
    }
    this.cdr.markForCheck();
  }

  isCurrentWeek(): boolean {
    return this.weekStart() === startOfWeek(todayISO());
  }

  isToday(date: string): boolean {
    return date === todayISO();
  }

  trackBlock(_: number, b: ScheduleBlock) {
    return b.id;
  }
}
