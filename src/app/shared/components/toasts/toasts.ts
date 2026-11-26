import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toasts',
  standalone: true,
  template: `
    <div class="cf-toasts" aria-live="polite">
      @for (t of service.toasts(); track t.id) {
        <div class="cf-toast" [class]="'cf-toast-' + t.kind" [attr.role]="t.kind === 'error' ? 'alert' : 'status'">
          <span class="cf-toast-icon" aria-hidden="true">{{ t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : 'i' }}</span>
          <span class="cf-toast-text">{{ t.text }}</span>
          <button type="button" class="cf-toast-close" aria-label="Dismiss" (click)="service.dismiss(t.id)">&times;</button>
        </div>
      }
    </div>
  `
})
export class Toasts {
  readonly service = inject(ToastService);
}
