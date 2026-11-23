import { Injectable, computed, inject, signal } from '@angular/core';
import { ClinicStore } from '../shared/services/clinic-store.service';

export type UserRole = 'admin' | 'patient';

interface Session {
  role: UserRole;
  userId: string;   // patient ID, or "admin"
}

const STORAGE_KEY = 'clinicflow.session';

/**
 * Mock authentication against the ClinicStore accounts.
 * NOTE: credentials checked in the browser are not secure — move this to the backend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly store = inject(ClinicStore);
  private readonly session = signal<Session | null>(this.restore());

  readonly patientId = computed(() => this.session()?.role === 'patient' ? this.session()!.userId : null);

  get role(): UserRole | null {
    return this.session()?.role ?? null;
  }

  /** Returns the role on success, or an error message. */
  login(email: string, password: string, rememberMe = false): { role: UserRole } | { error: string } {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) return { error: 'Enter your email and password.' };

    const admin = this.store.admin();
    if (normalized === admin.email.toLowerCase()) {
      return admin.password === password ? this.start({ role: 'admin', userId: 'admin' }, rememberMe) : { error: 'Incorrect email or password.' };
    }

    const patient = this.store.patientByEmail(normalized);
    if (!patient || patient.password !== password) return { error: 'Incorrect email or password.' };
    if (patient.status !== 'Active') return { error: 'This account is inactive. Please contact the clinic.' };
    return this.start({ role: 'patient', userId: patient.id }, rememberMe);
  }

  /** Signs in a patient right after registration. */
  loginPatient(patientId: string): void {
    this.start({ role: 'patient', userId: patientId }, false);
  }

  logout(): void {
    this.session.set(null);
    this.write(null, false);
  }

  /** The landing page for a role. */
  homeFor(role: UserRole): string {
    return role === 'admin' ? '/admin/dashboard' : '/patient/dashboard';
  }

  private start(session: Session, rememberMe: boolean): { role: UserRole } {
    this.session.set(session);
    this.write(session, rememberMe);
    return { role: session.role };
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
      const raw = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
      const s = raw ? JSON.parse(raw) as Session : null;
      return s && (s.role === 'admin' || s.role === 'patient') && s.userId ? s : null;
    } catch {
      return null;
    }
  }
}
