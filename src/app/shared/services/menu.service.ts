import { Injectable, inject, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';

/** The slide-in sidebar used on small screens. */
@Injectable({ providedIn: 'root' })
export class MenuService {
  readonly open = signal(false);

  constructor() {
    inject(Router).events.subscribe(e => {
      if (e instanceof NavigationStart) this.open.set(false);
    });
  }

  toggle(): void {
    this.open.update(v => !v);
  }

  close(): void {
    this.open.set(false);
  }
}
