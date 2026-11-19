import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon, LucideChevronDown } from '@lucide/angular';

@Component({
  selector: 'app-patient-navbar',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  templateUrl: './patient-navbar.html',
  styleUrls: ['./patient-navbar.css']
})
export class PatientNavbarComponent {
  readonly ChevronDownIcon = LucideChevronDown;

  tagline = 'Your care, in one place';
  patientName = 'Emma Wilson';
  patientId = 'Patient · CF-1024';
}