import { ToastService } from '../../services/toast.service';
import { ChangeDetectorRef, Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth/auth.service';

/** "Change password" button and form, used by both the admin and patient portals. */
@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (message) { <p class="cf-alert cf-alert-success" role="status">{{ message }}</p> }

    @if (!open) {
      <button type="button" class="btn-secondary" (click)="open = true; message = ''">Change password</button>
    } @else {
      <form class="cf-password" (ngSubmit)="submit()">
        <label class="cf-field"><span>Current password</span>
          <input type="password" name="current" [(ngModel)]="form.current" autocomplete="current-password" required>
        </label>
        <label class="cf-field"><span>New password (at least 8 characters)</span>
          <input type="password" name="next" [(ngModel)]="form.next" autocomplete="new-password" required>
        </label>
        <label class="cf-field"><span>Confirm new password</span>
          <input type="password" name="confirm" [(ngModel)]="form.confirm" autocomplete="new-password" required>
        </label>
        @if (error) { <p class="cf-alert cf-alert-error" role="alert">{{ error }}</p> }
        <div class="cf-actions">
          <button type="button" class="btn-secondary" (click)="close()">Cancel</button>
          <button type="submit" class="btn-primary" [disabled]="busy" [class.is-busy]="busy">Update password</button>
        </div>
      </form>
    }
  `
})
export class ChangePassword {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Emitted after the password has been changed. */
  readonly changed = output<void>();

  open = false;
  busy = false;
  form = { current: '', next: '', confirm: '' };
  message = '';
  error = '';

  close(): void {
    this.open = false;
    this.error = '';
    this.form = { current: '', next: '', confirm: '' };
  }

  async submit(): Promise<void> {
    this.error = '';
    if (this.busy) return;
    if (!this.form.current) { this.error = 'Enter your current password.'; return; }
    if (this.form.next !== this.form.confirm) { this.error = 'New passwords do not match.'; return; }
    this.busy = true;
    const result = await this.auth.changePassword(this.form.current, this.form.next);
    this.busy = false;
    if (result.ok) {
      this.close();
      this.message = 'Password updated. Other devices have been signed out.';
      this.toast.success('Password updated.');
      this.changed.emit();
    } else {
      this.error = result.error;
    }
    this.cdr.markForCheck();
  }
}
