import { Component, computed, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ClinicStore } from '../../shared/services/clinic-store.service';
import { LucideDynamicIcon, LucideArrowRight } from '@lucide/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-browse-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './browse-doctors.html',
  styleUrl: './browse-doctors.css'
})
export class BrowseDoctors {
  readonly ArrowRightIcon = LucideArrowRight;

  searchQuery = '';
  selectedSpecialty = 'All specialties';

  private readonly router = inject(Router);
  private readonly clinic = inject(ClinicStore);

  get specialties(): string[] {
    return ['All specialties', ...this.clinic.specialties()];
  }

  /** Doctors with their next open slot; doctors on leave are listed last. Cached until data changes. */
  private readonly allDoctors = computed(() =>
    [...this.clinic.doctors()]
      .sort((a, b) => (a.status === 'Active' ? 0 : 1) - (b.status === 'Active' ? 0 : 1))
      .map(d => {
        const next = d.status === 'Active' ? this.clinic.nextAvailable(d.id) : null;
        return {
          id: d.id, name: d.name, specialty: d.specialty,
          experience: `${d.experienceYears} years of experience`,
          onLeave: d.status !== 'Active',
          nextAvailable: next ? `${formatDate(next.date, 'EEE, d MMM', 'en-US')} · ${next.slot.label}` : null
        };
      })
  );

  get doctors() {
    return this.allDoctors();
  }

  /** Doctors matching the search text (name or specialty) and the selected specialty. */
  get filteredDoctors() {
    const query = this.searchQuery.trim().toLowerCase();
    return this.doctors.filter(doc => {
      const matchesSpecialty =
        this.selectedSpecialty === 'All specialties' || doc.specialty === this.selectedSpecialty;
      const matchesQuery =
        !query ||
        doc.name.toLowerCase().includes(query) ||
        doc.specialty.toLowerCase().includes(query);
      return matchesSpecialty && matchesQuery;
    });
  }

  get isFiltered(): boolean {
    return !!this.searchQuery.trim() || this.selectedSpecialty !== 'All specialties';
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedSpecialty = 'All specialties';
  }

  viewProfile(doctor: { id: string }) {
    this.router.navigate(['/patient/doctor-details', doctor.id]);
  }
}