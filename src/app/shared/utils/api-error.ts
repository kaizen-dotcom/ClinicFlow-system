import { HttpErrorResponse } from '@angular/common/http';

/** A readable message for a failed API call. The API sends errors as { "error": "message" }. */
export function apiError(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (typeof e.error?.error === 'string') return e.error.error;
    if (e.status === 429) return 'Too many attempts. Please wait a minute and try again.';
    // 5xx with no message is what the dev proxy returns when the API isn't running.
    if (e.status === 0 || e.status >= 500) return "Can't reach the clinic server. Please try again in a moment.";
  }
  return 'Something went wrong. Please try again.';
}
