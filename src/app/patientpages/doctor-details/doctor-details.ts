import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-doctor-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor-details.html',
  styleUrl: './doctor-details.css'
})
export class DoctorDetails implements OnInit {
  constructor(private route: ActivatedRoute) {}

  doctorMap: Record<string, any> = {
    'amelia-brooks': {
      name: 'Dr. Amelia Brooks',
      specialty: 'GENERAL MEDICINE',
      title: 'MD · Board-certified family physician',
      experience: '12 years of experience',
      languages: 'English · Spanish',
      location: 'ClinicFlow · Room 204',
      bio: 'Thoughtful, preventive care for adults and families. Specializing in routine check-ups, chronic condition management, and helping you feel confident about your health.'
    },
    'daniel-kim': {
      name: 'Dr. Daniel Kim',
      specialty: 'CARDIOLOGY',
      title: 'MD · Interventional cardiologist',
      experience: '10 years of experience',
      languages: 'English · Korean',
      location: 'ClinicFlow · Cardiology Wing',
      bio: 'Focused on heart health, preventive screening, and personalized care plans for patients with long-term cardiovascular concerns.'
    },
    'maya-patel': {
      name: 'Dr. Maya Patel',
      specialty: 'DENTISTRY',
      title: 'DDS · Cosmetic and restorative dentist',
      experience: '8 years of experience',
      languages: 'English · Hindi',
      location: 'ClinicFlow · Dental Suite',
      bio: 'Provides restorative, preventive, and cosmetic dental care with a gentle approach tailored to each patient’s smile goals.'
    },
    'james-carter': {
      name: 'Dr. James Carter',
      specialty: 'DERMATOLOGY',
      title: 'MD · Dermatology specialist',
      experience: '9 years of experience',
      languages: 'English',
      location: 'ClinicFlow · Skin Clinic',
      bio: 'Helps patients treat acne, rashes, and skin conditions with evidence-based dermatology care and long-term skin health planning.'
    },
    'sophia-lee': {
      name: 'Dr. Sophia Lee',
      specialty: 'PEDIATRICS',
      title: 'MD · Pediatrician',
      experience: '11 years of experience',
      languages: 'English · Mandarin',
      location: 'ClinicFlow · Pediatric Ward',
      bio: 'Compassionate pediatric care for infants, children, and adolescents with preventive visits and family-centered treatment plans.'
    },
    'noah-williams': {
      name: 'Dr. Noah Williams',
      specialty: 'ORTHOPEDICS',
      title: 'MD · Orthopedic surgeon',
      experience: '14 years of experience',
      languages: 'English',
      location: 'ClinicFlow · Orthopedic Center',
      bio: 'Treats bone, joint, and sports injuries with a focus on mobility restoration, pain management, and surgical recovery planning.'
    }
  };

  doctor: any = this.doctorMap['amelia-brooks'];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') || 'amelia-brooks';
      this.doctor = this.doctorMap[id] || this.doctorMap['amelia-brooks'];
    });
  }

  // Mock doctor profile
  dates = [
    { day: 'Thu', date: '12', number: 12, month: 10, year: 2026 },
    { day: 'Fri', date: '13', number: 13, month: 10, year: 2026 },
    { day: 'Mon', date: '16', number: 16, month: 10, year: 2026, selected: true },
    { day: 'Tue', date: '17', number: 17, month: 10, year: 2026 },
    { day: 'Wed', date: '18', number: 18, month: 10, year: 2026 }
  ];

  timeSlots = [
    { time: '09:00 AM', status: 'available' },
    { time: '09:30 AM', status: 'partial' },
    { time: '10:00 AM', status: 'selected' },
    { time: '10:30 AM', status: 'available' },
    { time: '11:00 AM', status: 'unavailable' },
    { time: '11:30 AM', status: 'available' }
  ];

  selectedDate = 'Monday, 16 November';
  selectedTime = '10:00–10:30 AM';

  selectDate(index: number) {
    this.dates.forEach(d => d.selected = false);
    this.dates[index].selected = true;
  }
}