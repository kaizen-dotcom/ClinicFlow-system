import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from './auth.service';

/**
 * Allows the route only for the given role.
 * Logged-out users go to /login; users with another role go to their own dashboard.
 */
export function roleGuard(allowed: UserRole): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const role = auth.role;

    if (!role) {
      return router.parseUrl('/login');
    }
    if (role !== allowed) {
      return router.parseUrl(auth.homeFor(role));
    }
    return true;
  };
}

/** Keeps logged-in users out of the login and sign-up pages. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const role = auth.role;
  return role ? inject(Router).parseUrl(auth.homeFor(role)) : true;
};
