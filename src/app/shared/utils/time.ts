/** Date/time helpers. Dates are ISO strings ("2026-11-24"), times are 24h "HH:mm". */

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(iso: string): number {
  return parseISO(iso).getDay();
}

export function isWeekend(iso: string): boolean {
  const w = weekday(iso);
  return w === 0 || w === 6;
}

/** Monday of the week containing `iso`. */
export function startOfWeek(iso: string): string {
  const w = weekday(iso);
  return addDays(iso, w === 0 ? -6 : 1 - w);
}

/** Moves `n` weekdays from `iso` (n may be negative; n = 0 returns the same or next weekday). */
export function addWeekdays(iso: string, n: number): string {
  let d = iso;
  while (isWeekend(d)) d = addDays(d, 1);
  const step = n < 0 ? -1 : 1;
  let left = Math.abs(n);
  while (left > 0) {
    d = addDays(d, step);
    if (!isWeekend(d)) left--;
  }
  return d;
}

export function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function addMinutes(hhmm: string, mins: number): string {
  return fromMinutes(minutes(hhmm) + mins);
}

/** "13:30" -> "01:30 PM" */
export function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad(h12)}:${pad(m)} ${suffix}`;
}

export function nowHHmm(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
