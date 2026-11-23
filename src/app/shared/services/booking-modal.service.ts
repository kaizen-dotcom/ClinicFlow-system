import { Injectable, signal } from '@angular/core';

export interface BookingPreset {
  doctorId: string | null;
  date?: string;   // ISO date
  time?: string;   // "HH:mm"
}

/** Opens and closes the patient "Book appointment" modal from anywhere in the patient portal. */
@Injectable({ providedIn: 'root' })
export class BookingModalService {
  readonly isOpen = signal(false);
  /** Doctor (and optionally date/time) to preselect when the modal opens. */
  readonly preset = signal<BookingPreset>({ doctorId: null });

  open(doctorId: string | null = null, date?: string, time?: string): void {
    this.preset.set({ doctorId, date, time });
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
