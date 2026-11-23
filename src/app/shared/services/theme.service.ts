import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'clinicflow.theme';

/**
 * Light/dark theme for the patient portal.
 * The choice is saved in localStorage; with no saved choice it follows the OS setting.
 * Colors come from the CSS variables in styles.css (html[data-theme="dark"]).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.initialTheme());

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage unavailable (e.g. private mode): the theme still applies for this session.
    }
    this.apply();
  }

  /** Applies the current theme to <html>. */
  apply(): void {
    document.documentElement.setAttribute('data-theme', this.theme());
  }

  /** Removes the theme from <html> (used when leaving the patient portal). */
  clear(): void {
    document.documentElement.removeAttribute('data-theme');
  }

  private initialTheme(): Theme {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // ignore
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
