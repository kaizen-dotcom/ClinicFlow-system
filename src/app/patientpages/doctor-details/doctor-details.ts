import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { BookingModalService } from '../../shared/services/booking-modal.service';
import { ClinicStore } from '../../shared/services/clinic-store.service';
import { Slot } from '../../shared/services/clinic.models';

@Component({
  selector: 'app-doctor-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './doctor-details.html',
  styleUrl: './doctor-details.css'
})
export class DoctorDetails {
  readonly booking = inject(BookingModalService);
  private readonly clinic = inject(ClinicStore);

  readonly clinicName = computed(() => this.clinic.clinicInfo().name);

  private readonly doctorId = toSignal(inject(ActivatedRoute).paramMap.pipe(map(p => p.get('id') ?? '')), { initialValue: '' });
  readonly doctor = computed(() => this.clinic.doctor(this.doctorId()));

  /** Next dates with open slots (up to 7). */
  readonly dates = computed(() => {
    const d = this.doctor();
    return d && d.status === 'Active' ? this.clinic.availableDates(d.id, 7) : [];
  });

  private readonly chosenDate = signal<string | null>(null);
  readonly selectedDate = computed(() => {
    const chosen = this.chosenDate();
    return chosen && this.dates().includes(chosen) ? chosen : (this.dates()[0] ?? null);
  });

  readonly slots = computed<Slot[]>(() => {
    const d = this.doctor();
    const date = this.selectedDate();
    return d && date ? this.clinic.slotsFor(d.id, date) : [];
  });

  readonly selectedTime = signal<string | null>(null);

  selectDate(date: string): void {
    this.chosenDate.set(date);
    this.selectedTime.set(null);
  }

  selectSlot(slot: Slot): void {
    if (slot.available) this.selectedTime.set(slot.time);
  }

  selectedLabel(): string | null {
    return this.slots().find(s => s.time === this.selectedTime())?.label ?? null;
  }

  continueToBooking(): void {
    const d = this.doctor();
    if (d) this.booking.open(d.id, this.selectedDate() ?? undefined, this.selectedTime() ?? undefined);
  }
}
