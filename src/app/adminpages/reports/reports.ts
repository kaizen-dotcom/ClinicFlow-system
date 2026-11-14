import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class Reports {
  // 1. Top Stat Cards
  statCards = [
    { label: 'Total appointments', value: '248' },
    { label: 'Completed', value: '162' },
    { label: 'Cancelled', value: '10' },
    { label: 'Pending review', value: '08' }
  ];

  // 2. Bar Chart Data (Mocking the 10 days)
  barChartData = [
    { day: '01', count: 18, height: '45%' },
    { day: '02', count: 22, height: '55%' },
    { day: '03', count: 26, height: '65%' },
    { day: '04', count: 24, height: '60%' },
    { day: '05', count: 30, height: '75%' },
    { day: '06', count: 20, height: '50%' },
    { day: '07', count: 28, height: '70%' },
    { day: '08', count: 34, height: '85%' },
    { day: '09', count: 32, height: '80%' },
    { day: '10', count: 38, height: '95%' }
  ];

  // 3. Status Breakdown Data
  statusData = [
    { label: 'Completed', count: 162, percent: '65.3%', color: '#138A4B' }, // Green
    { label: 'Approved', count: 64, percent: '25.8%', color: '#3B82F6' },  // Blue
    { label: 'Pending', count: 8, percent: '3.2%', color: '#F59E0B' },     // Amber
    { label: 'Cancelled', count: 10, percent: '4.0%', color: '#64748B' },  // Gray
    { label: 'Rejected', count: 4, percent: '1.6%', color: '#EF4444' }     // Red
  ];

  // 4. Summary Table Data
  doctorsSummary = [
    { doctor: 'Dr. Amelia Brooks', total: 60, completed: 42, approved: 14, other: 4 },
    { doctor: 'Dr. Daniel Kim', total: 48, completed: 33, approved: 12, other: 3 },
    { doctor: 'Dr. Maya Patel', total: 42, completed: 28, approved: 10, other: 4 },
    { doctor: 'Dr. Elena Garcia', total: 36, completed: 24, approved: 9, other: 3 },
    { doctor: 'Dr. Oliver Chen', total: 34, completed: 20, approved: 10, other: 4 },
    { doctor: 'Other doctors', total: 28, completed: 15, approved: 9, other: 4 }
  ];
}