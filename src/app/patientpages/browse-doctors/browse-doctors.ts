import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-browse-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './browse-doctors.html',
  styleUrl: './browse-doctors.css'
})
export class BrowseDoctors {
  searchQuery = '';
  selectedSpecialty = 'All specialties';

  constructor(private router: Router) {}

  specialties = ['All specialties', 'General medicine', 'Cardiology', 'Dentistry', 'Dermatology', 'Pediatrics', 'Orthopedics'];

  doctors = [
    { id: 'amelia-brooks', name: 'Dr. Amelia Brooks', specialty: 'General medicine', experience: '12 years of experience', nextAvailable: 'Thu, 12 Nov · 09:00 AM' },
    { id: 'daniel-kim', name: 'Dr. Daniel Kim', specialty: 'Cardiology', experience: '10 years of experience', nextAvailable: 'Wed, 18 Nov · 10:30 AM' },
    { id: 'maya-patel', name: 'Dr. Maya Patel', specialty: 'Dentistry', experience: '8 years of experience', nextAvailable: 'Fri, 13 Nov · 11:00 AM' },
    { id: 'james-carter', name: 'Dr. James Carter', specialty: 'Dermatology', experience: '9 years of experience', nextAvailable: 'Fri, 13 Nov · 02:00 PM' },
    { id: 'sophia-lee', name: 'Dr. Sophia Lee', specialty: 'Pediatrics', experience: '11 years of experience', nextAvailable: 'Mon, 16 Nov · 09:30 AM' },
    { id: 'noah-williams', name: 'Dr. Noah Williams', specialty: 'Orthopedics', experience: '14 years of experience', nextAvailable: 'Mon, 16 Nov · 01:00 PM' }
  ];

  viewProfile(doctor: any) {
    this.router.navigate(['/patient/doctor-details', doctor.id]);
  }
}