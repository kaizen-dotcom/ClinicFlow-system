import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon, LucideBell, LucideArrowRight } from '@lucide/angular';
import { AdminUiService } from '../../services/admin-ui.service';
import { ClinicStore } from '../../services/clinic-store.service';

const STORAGE_KEY = 'clinicflow.admin.read';
const LIMIT = 20;

/** Things patients do that the clinic should know about, by appointment history label. */
const TITLES: Record<string, string> = {
  'Request sent': 'New appointment request',
  'Rescheduled by patient': 'Patient asked for a new time',
  'Cancelled by patient': 'Patient cancelled'
};

interface Notice {
  key: string;
  appointmentId: string;
  title: string;
  detail: string;
  visit: string;       // ISO date of the visit
  time: string;
  at: string;          // ISO date-time it happened
  unread: boolean;
}

/**
 * The admin's notification bell. Notices come from each appointment's history (so they survive reloads and
 * arrive live); which ones have been read is remembered in this browser.
 */
@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideDynamicIcon, LucideArrowRight],
  templateUrl: './admin-notifications.html',
  styleUrl: './admin-notifications.css'
})
export class AdminNotifications {
  private readonly clinic = inject(ClinicStore);
  private readonly ui = inject(AdminUiService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly BellIcon = LucideBell;
  readonly open = signal(false);
  private readonly read = signal<ReadonlySet<string>>(this.restore());

  /** Newest first. */
  readonly notices = computed<Notice[]>(() => {
    const read = this.read();
    return this.clinic.appointments()
      .flatMap(a => a.history.filter(h => TITLES[h.label]).map(h => {
        const key = `${a.id}|${h.label}|${h.date}`;
        return {
          key, appointmentId: a.id, title: TITLES[h.label], detail: `${a.patient} · ${a.doctor}`,
          visit: a.date, time: a.start, at: h.date, unread: !read.has(key)
        };
      }))
      .sort((x, y) => y.at.localeCompare(x.at))
      .slice(0, LIMIT);
  });

  readonly unreadCount = computed(() => this.notices().filter(n => n.unread).length);

  toggle(): void {
    this.open.update(v => !v);
  }

  /** Marks the notice read and opens the appointment. */
  view(n: Notice): void {
    this.markRead([n.key]);
    this.open.set(false);
    this.ui.review(n.appointmentId);
  }

  markAllRead(): void {
    this.markRead(this.notices().map(n => n.key));
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }

  private markRead(keys: string[]): void {
    const next = new Set([...this.read(), ...keys]);
    this.read.set(next);
    try {
      // Only the most recent entries can still be shown, so older ones are dropped.
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next].slice(-200)));
    } catch {
      // Storage unavailable: read state lasts until reload.
    }
  }

  private restore(): Set<string> {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return new Set(Array.isArray(saved) ? saved : []);
    } catch {
      return new Set();
    }
  }
}
