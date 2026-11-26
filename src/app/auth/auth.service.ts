import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiError } from '../shared/utils/api-error';

export type UserRole = 'admin' | 'patient';

export interface Session {
  role: UserRole;
  userId: string;      // patient ID, or "admin"
  token: string;       // sent with every API request
  expiresAt: string;   // ISO date-time
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  dob: string;
}

const STORAGE_KEY = 'clinicflow.session';

export type AuthResult = { role: UserRole } | { error: string };

/** Signs users in against the API and keeps the access token for the session. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = signal<Session | null>(this.restore());

  readonly userId = computed(() => this.session()?.userId ?? null);
  readonly patientId = computed(() => this.session()?.role === 'patient' ? this.session()!.userId : null);

  /** The signed-in role, or null when signed out or the token has expired. */
  get role(): UserRole | null {
    return this.activeSession()?.role ?? null;
  }

  get token(): string | null {
    return this.activeSession()?.token ?? null;
  }

  /** Returns the role on success, or an error message. */
  async login(email: string, password: string, rememberMe = false): Promise<AuthResult> {
    if (!email.trim() || !password) return { error: 'Enter your email and password.' };
    return this.authenticate('/api/auth/login', { email: email.trim(), password }, rememberMe);
  }

  /** Creates a patient account. The patient is not signed in: they log in afterwards. */
  async register(input: RegisterInput): Promise<{ ok: true } | { error: string }> {
    try {
      await firstValueFrom(this.http.post('/api/auth/register', input));
      return { ok: true };
    } catch (e) {
      return { error: apiError(e) };
    }
  }

  /** True while a password change is in flight, when requests using the old token are expected to fail. */
  changingPassword = false;

  /** Changes the signed-in user's password; other devices are signed out and this one stays in. */
  async changePassword(current: string, next: string): Promise<{ ok: true } | { ok: false; error: string }> {
    if (next.length < 8) return { ok: false, error: 'New password must be at least 8 characters.' };
    this.changingPassword = true;
    try {
      const res = await firstValueFrom(this.http.post<Session>('/api/auth/password', { current, next }));
      const remembered = this.isRemembered();
      this.session.set(res);
      this.write(res, remembered);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: apiError(e) };
    } finally {
      this.changingPassword = false;
    }
  }

  logout(): void {
    this.session.set(null);
    this.write(null, false);
  }

  /** The landing page for a role. */
  homeFor(role: UserRole): string {
    return role === 'admin' ? '/admin/dashboard' : '/patient/dashboard';
  }

  private async authenticate(url: string, body: object, rememberMe: boolean): Promise<AuthResult> {
    try {
      const res = await firstValueFrom(this.http.post<Session>(url, body));
      this.session.set(res);
      this.write(res, rememberMe);
      return { role: res.role };
    } catch (e) {
      return { error: apiError(e) };
    }
  }

  private isRemembered(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  }

  private activeSession(): Session | null {
    const s = this.session();
    return s && Date.parse(s.expiresAt) > Date.now() ? s : null;
  }

  private write(session: Session | null, rememberMe: boolean): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      if (session) (rememberMe ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage unavailable: session lasts until reload.
    }
  }

  private restore(): Session | null {
    try {
      // Remove the browser-only database used by earlier versions of the app.
      localStorage.removeItem('clinicflow.db.v1');
      const raw = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
      const s = raw ? JSON.parse(raw) as Session : null;
      return s && (s.role === 'admin' || s.role === 'patient') && s.userId && s.token ? s : null;
    } catch {
      return null;
    }
  }
}
