import { Component, inject, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { Toasts } from './shared/components/toasts/toasts';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toasts],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  /** True while a page and its data are loading. */
  protected readonly loading = signal(false);

  /** Shown instead of a blank screen while entering a portal for the first time. */
  protected readonly placeholder = signal(false);

  constructor() {
    const router = inject(Router);
    const portal = (url: string) => url.split('/')[1] === 'admin' || url.split('/')[1] === 'patient' ? url.split('/')[1] : '';
    router.events.subscribe(e => {
      if (e instanceof NavigationStart) {
        this.loading.set(true);
        this.placeholder.set(!!portal(e.url) && portal(e.url) !== portal(router.url));
      } else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) {
        this.loading.set(false);
        this.placeholder.set(false);
      }
    });
  }
}
