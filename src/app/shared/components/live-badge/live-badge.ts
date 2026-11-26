import { Component, inject } from '@angular/core';
import { ClinicStore } from '../../services/clinic-store.service';

/** Shows whether updates are arriving in real time. */
@Component({
  selector: 'app-live-badge',
  standalone: true,
  template: `
    <span class="live-badge" [class.on]="clinic.live()" role="status"
          [attr.title]="clinic.live() ? 'Changes appear instantly' : 'Live connection lost. Checking for changes periodically.'">
      <span class="dot" aria-hidden="true"></span>{{ clinic.live() ? 'Live' : 'Connecting…' }}
    </span>
  `,
  styles: [`
    .live-badge {
      display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px;
      font-size: 12px; font-weight: 600; white-space: nowrap;
      background: var(--badge-amber-bg); color: var(--badge-amber-text);
    }
    .live-badge.on { background: var(--badge-green-bg); color: var(--badge-green-text); }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .on .dot { animation: pulse 1.8s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: 0.3; } }
  `]
})
export class LiveBadge {
  readonly clinic = inject(ClinicStore);
}
