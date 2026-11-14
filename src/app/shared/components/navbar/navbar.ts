import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideDynamicIcon, LucideMenu, LucideSearch, LucideChevronDown } from '@lucide/angular';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent {
  // Expose icons for the HTML
  readonly MenuIcon = LucideMenu;
  readonly SearchIcon = LucideSearch;
  readonly ChevronDownIcon = LucideChevronDown;

  // Hardcoded for now, we will connect this to real data later
  currentDate = 'Tuesday, 10 Nov 2026';
  adminName = 'Sarah Mitchell';
  adminRole = 'Administrator';
}