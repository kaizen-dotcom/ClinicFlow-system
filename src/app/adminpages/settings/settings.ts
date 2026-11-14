import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings {
  // Mock data for the form
  adminData = {
    fullName: 'Reynier Forth',
    email: 'reynier.forth@clinicflow.com',
    phone: '+1 (212) 555-0148',
    role: 'Administrator · Full access',
    clinicName: 'ClinicFlow Medical Center',
    language: 'English (United States)',
    timeZone: 'Eastern Time (EST)',
    dateFormat: 'DD MMM YYYY',
    lastPasswordUpdate: '28 October 2026'
  };

  // Tabs state
  activeTab = 'account'; // 'account', 'security', 'clinic'

  setTab(tab: string) {
    this.activeTab = tab;
  }
}