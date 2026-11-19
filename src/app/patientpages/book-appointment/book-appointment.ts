import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './book-appointment.html',
  styleUrl: './book-appointment.css'
})
export class BookAppointment {
  // Stepper state
  currentStep = 1;

  // Doctor selection
  selectedDoctor = 'Dr. Amelia Brooks - General medicine';
  doctors = [
    'Dr. Amelia Brooks - General medicine',
    'Dr. Daniel Kim - Cardiology',
    'Dr. Maya Patel - Dentistry',
    'Dr. James Carter - Dermatology'
  ];

  // Date selector
  dates = [
    { day: 'Thu', date: '12', selected: false },
    { day: 'Fri', date: '13', selected: false },
    { day: 'Mon', date: '16', selected: true },
    { day: 'Tue', date: '17', selected: false },
    { day: 'Wed', date: '18', selected: false }
  ];

  // Time slots
  timeSlots = [
    { time: '09:00 AM', status: 'available' },
    { time: '09:30 AM', status: 'partial' },
    { time: '10:00 AM', status: 'selected' },
    { time: '10:30 AM', status: 'available' },
    { time: '11:00 AM', status: 'unavailable' },
    { time: '11:30 AM', status: 'available' }
  ];

  // Appointment types
  appointmentTypes = ['General consultation', 'Follow-up visit', 'Specialist consultation'];
  selectedType = 'General consultation';
  visitReason = 'Routine check-up and preventive care.';

  // Summary data
  summary = {
    doctor: 'Dr. Amelia Brooks',
    date: 'Monday, 16 November 2026',
    time: '10:00–10:30 AM',
    location: 'ClinicFlow · Room 204',
    status: 'Pending'
  };

  selectDate(index: number) {
    this.dates.forEach(d => d.selected = false);
    this.dates[index].selected = true;
  }

  selectSlot(index: number) {
    this.timeSlots.forEach(s => {
      if (s.status === 'selected') s.status = 'available';
    });
    this.timeSlots[index].status = 'selected';
  }
}