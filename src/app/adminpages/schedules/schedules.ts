import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedules.html',
  styleUrl: './schedules.css'
})
export class Schedules {
  // Days for the calendar header
  days = [
    { label: 'MON 09', date: '09' },
    { label: 'TUE 10', date: '10' },
    { label: 'WED 11', date: '11' },
    { label: 'THU 12', date: '12' },
    { label: 'FRI 13', date: '13' }
  ];

  // Mock schedules for the grid. 
  // In a real app, this would come from the database based on the selected week.
  // We use grid-row and grid-column to place these blocks.
  scheduleBlocks = [
    // Monday
    { day: 1, startHour: 1, duration: 3, title: '09:00 – 12:00', subtitle: '6 slots · 30 min', type: 'available' },
    { day: 1, startHour: 5, duration: 2, title: '14:00 – 16:00', subtitle: '4 slots · 30 min', type: 'available' },
    // Tuesday
    { day: 2, startHour: 1, duration: 3, title: '09:00 – 12:00', subtitle: '6 slots · 30 min', type: 'available' },
    { day: 2, startHour: 4, duration: 4, title: '13:00 – 17:00', subtitle: '8 slots · 30 min', type: 'partial' },
    // Wednesday
    { day: 3, startHour: 1, duration: 3, title: '09:00 – 12:00', subtitle: '6 slots · 30 min', type: 'available' },
    { day: 3, startHour: 5, duration: 2, title: '14:00 – 16:00', subtitle: '4 slots · 30 min', type: 'available' },
    // Thursday
    { day: 4, startHour: 2, duration: 3, title: '10:00 – 13:00', subtitle: '6 slots · 30 min', type: 'partial' },
    { day: 4, startHour: 5, duration: 2, title: '14:00 – 16:00', subtitle: '4 slots · 30 min', type: 'available' },
    // Friday
    { day: 5, startHour: 1, duration: 3, title: '09:00 – 12:00', subtitle: '6 slots · 30 min', type: 'available' }
  ];
}