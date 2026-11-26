import { LucideCircleCheck, LucideCircleAlert, LucideInfo, LucideX } from '@lucide/angular';
import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [LucideCircleCheck, LucideCircleAlert, LucideInfo, LucideX],
  template: `
    <div class="cf-toasts" aria-live="polite">
      @for (t of service.toasts(); track t.id) {
        <div class="cf-toast" [class]="'cf-toast-' + t.kind" [attr.role]="t.kind === 'error' ? 'alert' : 'status'">
          <span class="cf-toast-icon">
            @switch (t.kind) {
              @case ('success') { <svg lucideCircleCheck size="20" aria-hidden="true"></svg> }
              @case ('error') { <svg lucideCircleAlert size="20" aria-hidden="true"></svg> }
              @default { <svg lucideInfo size="20" aria-hidden="true"></svg> }
            }
          </span>
          <span class="cf-toast-text">{{ t.text }}</span>
          <button type="button" class="cf-toast-close" aria-label="Dismiss" (click)="service.dismiss(t.id)"><svg lucideX size="16" aria-hidden="true"></svg></button>
        </div>
      }
    </div>
  `
})
export class Toasts {
  readonly service = inject(ToastService);
}
