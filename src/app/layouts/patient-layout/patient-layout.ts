import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { PatientSidebarComponent } from '../../shared/components/patient-sidebar/patient-sidebar';
import { PatientNavbarComponent } from '../../shared/components/patient-navbar/patient-navbar';

@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, PatientSidebarComponent, PatientNavbarComponent],
  templateUrl: './patient-layout.html',
  styleUrls: ['./patient-layout.css']
})
export class PatientLayoutComponent {}
