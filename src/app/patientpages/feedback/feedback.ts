import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-feedback-states',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './feedback.html',
  styleUrl: './feedback.css'
})
export class FeedbackStates {}