import {
  Component, ElementRef, OnDestroy, ViewChild, computed, forwardRef, inject, input, signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideCalendar, LucideChevronLeft, LucideChevronRight } from '@lucide/angular';
import { addDays, parseISO, toISODate, todayISO } from '../../utils/time';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Date field with a calendar popup. Works with ngModel like <input type="date">:
 * the value is an ISO date ("2026-11-24"), or "" when empty or not a valid date.
 */
@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [LucideCalendar, LucideChevronLeft, LucideChevronRight],
  templateUrl: './date-picker.html',
  styleUrls: ['./date-picker.css'],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DatePicker), multi: true }],
  host: {
    '(document:pointerdown)': 'onOutsidePointer($event)',
    '(focusout)': 'onFocusOut($event)',
    '(keydown.escape)': 'onEscape($event)'
  }
})
export class DatePicker implements ControlValueAccessor, OnDestroy {
  readonly inputId = input<string>();
  readonly ariaLabel = input<string>();
  /** Earliest and latest selectable dates (ISO). */
  readonly min = input('1900-01-01');
  readonly max = input(`${new Date().getFullYear() + 10}-12-31`);

  readonly weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  readonly value = signal('');
  readonly text = signal('');
  readonly open = signal(false);
  readonly disabled = signal(false);
  /** The day that has keyboard focus; its month is the one on screen. */
  readonly cursor = signal(todayISO());

  readonly month = computed(() => parseISO(this.cursor()).getMonth());
  readonly year = computed(() => parseISO(this.cursor()).getFullYear());

  readonly months = computed(() => MONTHS.map((name, index) => {
    const first = toISODate(new Date(this.year(), index, 1));
    const last = toISODate(new Date(this.year(), index + 1, 0));
    return { index, name, disabled: last < this.min() || first > this.max() };
  }));

  readonly years = computed(() => {
    const from = parseISO(this.min()).getFullYear();
    const to = parseISO(this.max()).getFullYear();
    return Array.from({ length: to - from + 1 }, (_, i) => to - i);
  });

  /** Six full weeks, starting on the Sunday on or before the 1st. */
  readonly weeks = computed(() => {
    const first = new Date(this.year(), this.month(), 1);
    const start = addDays(toISODate(first), -first.getDay());
    const today = todayISO();
    return Array.from({ length: 6 }, (_, week) => Array.from({ length: 7 }, (_, day) => {
      const iso = addDays(start, week * 7 + day);
      const date = parseISO(iso);
      return {
        iso,
        day: date.getDate(),
        label: `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
        outside: date.getMonth() !== this.month(),
        today: iso === today,
        disabled: !this.inRange(iso)
      };
    }));
  });

  readonly canGoBack = computed(() => toISODate(new Date(this.year(), this.month(), 0)) >= this.min());
  readonly canGoForward = computed(() => toISODate(new Date(this.year(), this.month() + 1, 1)) <= this.max());
  readonly todayAllowed = computed(() => this.inRange(todayISO()));

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private popup?: HTMLElement;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  @ViewChild('field', { static: true }) private field!: ElementRef<HTMLElement>;
  @ViewChild('box', { static: true }) private box!: ElementRef<HTMLInputElement>;

  /** Shows the popup in the browser's top layer, so modals and scroll areas can't clip it. */
  @ViewChild('popup') set popupRef(ref: ElementRef<HTMLElement> | undefined) {
    this.popup = ref?.nativeElement;
    if (!this.popup) return;
    this.popup.showPopover?.();
    // Measure once the days inside it have been rendered.
    queueMicrotask(this.position);
  }

  writeValue(value: string | null | undefined): void {
    this.value.set(value ?? '');
    this.text.set(format(value ?? ''));
  }

  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
    if (disabled) this.close();
  }

  show(): void {
    if (this.open() || this.disabled()) return;
    this.cursor.set(this.clamp(this.value() || todayISO()));
    this.open.set(true);
    window.addEventListener('scroll', this.position, true);
    window.addEventListener('resize', this.position);
  }

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    window.removeEventListener('scroll', this.position, true);
    window.removeEventListener('resize', this.position);
  }

  openFromKeyboard(): void {
    this.show();
    this.focusCursor();
  }

  today(): string {
    return todayISO();
  }

  toggle(): void {
    if (this.open()) {
      this.close();
    } else {
      this.openFromKeyboard();
    }
  }

  onType(raw: string): void {
    this.text.set(raw);
    const iso = parseTyped(raw);
    const next = iso && this.inRange(iso) ? iso : '';
    if (next) this.cursor.set(next);
    this.commit(next);
  }

  /** Tidies a valid typed date ("1/5/2006" -> "01/05/2006"); leaves anything else as typed. */
  onBlurInput(): void {
    if (this.value()) this.text.set(format(this.value()));
  }

  pick(iso: string): void {
    if (!this.inRange(iso)) return;
    this.text.set(format(iso));
    this.commit(iso);
    this.finish();
  }

  clear(): void {
    this.text.set('');
    this.commit('');
    this.finish();
  }

  moveMonth(step: number): void {
    this.showMonth(this.year(), this.month() + step);
  }

  showMonth(year: number, month: number): void {
    const day = parseISO(this.cursor()).getDate();
    const lastDay = new Date(year, month + 1, 0).getDate();
    this.cursor.set(this.clamp(toISODate(new Date(year, month, Math.min(day, lastDay)))));
  }

  onGridKey(event: KeyboardEvent): void {
    const days: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in days) {
      this.cursor.set(this.clamp(addDays(this.cursor(), days[event.key])));
    } else if (event.key === 'PageUp') {
      this.moveMonth(-1);
    } else if (event.key === 'PageDown') {
      this.moveMonth(1);
    } else {
      return;
    }
    event.preventDefault();
    this.focusCursor();
  }

  onEscape(event: Event): void {
    if (!this.open()) return;
    // Close only the calendar, not a dialog around it.
    event.preventDefault();
    event.stopPropagation();
    this.finish();
  }

  onOutsidePointer(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
      this.onTouched();
    }
  }

  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.host.nativeElement.contains(next)) return;
    // Some browsers don't focus clicked buttons, so no target doesn't mean the user left.
    if (!next && this.open()) return;
    this.close();
    this.onTouched();
  }

  ngOnDestroy(): void {
    this.close();
  }

  private commit(iso: string): void {
    if (iso === this.value()) return;
    this.value.set(iso);
    this.onChange(iso);
  }

  private finish(): void {
    this.box.nativeElement.focus();
    this.close();
  }

  private inRange(iso: string): boolean {
    return iso >= this.min() && iso <= this.max();
  }

  private clamp(iso: string): string {
    if (iso < this.min()) return this.min();
    return iso > this.max() ? this.max() : iso;
  }

  private focusCursor(): void {
    // Wait for the new month to be rendered.
    setTimeout(() => this.popup?.querySelector<HTMLElement>(`[data-date="${this.cursor()}"]`)?.focus());
  }

  /** Places the popup under the field, or above it when there is no room below. */
  private readonly position = (): void => {
    if (!this.popup) return;
    const anchor = this.field.nativeElement.getBoundingClientRect();
    const width = this.popup.offsetWidth;
    const height = this.popup.offsetHeight;
    const gap = 6;
    const below = anchor.bottom + gap;
    const fitsBelow = below + height <= window.innerHeight;
    const top = fitsBelow ? below : anchor.top - gap - height;
    const left = Math.min(anchor.left, window.innerWidth - width - 8);
    this.popup.style.top = `${Math.max(8, Math.min(top, window.innerHeight - height - 8))}px`;
    this.popup.style.left = `${Math.max(8, left)}px`;
  };
}

/** "2006-10-28" -> "10/28/2006" */
function format(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : '';
}

/** "10/28/2006" (or "2006-10-28") -> "2006-10-28"; "" if it isn't a real date. */
function parseTyped(raw: string): string {
  const text = raw.trim();
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!us && !iso) return '';
  const [y, m, d] = us ? [+us[3], +us[1], +us[2]] : [+iso![1], +iso![2], +iso![3]];
  const date = new Date(y, m - 1, d);
  const real = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  return real ? toISODate(date) : '';
}
