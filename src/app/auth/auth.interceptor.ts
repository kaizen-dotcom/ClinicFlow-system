import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Adds the access token to API requests and returns to the login page when the session has ended. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Login and registration are anonymous.
  if (!req.url.startsWith('/api/') || req.url === '/api/auth/login' || req.url === '/api/auth/register') return next(req);

  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // Ignore late answers to requests that carried an older token.
      if (error.status === 401 && token === auth.token && !auth.changingPassword) {
        auth.logout();
        router.navigateByUrl('/login');
      }
      return throwError(() => error);
    })
  );
};
