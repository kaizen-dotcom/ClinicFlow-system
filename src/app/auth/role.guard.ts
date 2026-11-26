import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ClinicStore } from '../shared/services/clinic-store.service';
import { AuthService, UserRole } from './auth.service';

/**
 * Allows the route only for the given role, and loads that user's data before showing it.
 * Logged-out users go to /login; users with another role go to their own dashboard.
 */
export function roleGuard(allowed: UserRole): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const store = inject(ClinicStore);
    const role = auth.role;

    if (!role) {
      return router.parseUrl('/login');
    }
    if (role !== allowed) {
      return router.parseUrl(auth.homeFor(role));
    }
    await store.ensureLoaded();
    // The server may have rejected the session while loading.
    return auth.role ? true : router.parseUrl('/login');
  };
}

/** Keeps logged-in users out of the login and sign-up pages. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const role = auth.role;
  return role ? inject(Router).parseUrl(auth.homeFor(role)) : true;
};
