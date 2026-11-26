import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

/** Short pop-up messages that confirm what just happened. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 0;

  success(text: string): void {
    this.show('success', text, 4500);
  }

  error(text: string): void {
    this.show('error', text, 8000);
  }

  info(text: string): void {
    this.show('info', text, 6000);
  }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private show(kind: ToastKind, text: string, duration: number): void {
    const id = ++this.nextId;
    // Keep the newest few so they never cover the page.
    this.toasts.update(list => [...list.slice(-3), { id, kind, text }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
