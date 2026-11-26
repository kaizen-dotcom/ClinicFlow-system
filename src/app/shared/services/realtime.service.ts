import { Injectable, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { AuthService } from '../../auth/auth.service';
import { ClinicStore } from './clinic-store.service';

const RETRY_MS = 5_000;

/**
 * Keeps a live connection (SignalR) to the server while a portal is open. When the server says something
 * changed, the data is reloaded at once. If the connection drops, the store's periodic check takes over.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private readonly store = inject(ClinicStore);

  private connection: HubConnection | null = null;
  private pending: ReturnType<typeof setTimeout> | undefined;
  private retry: ReturnType<typeof setTimeout> | undefined;

  start(): void {
    if (this.connection || !this.auth.token) return;
    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/clinic', { accessTokenFactory: () => this.auth.token ?? '' })
      // Keep trying, waiting a little longer each time.
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: c => Math.min(1000 * 2 ** c.previousRetryCount, 15_000) })
      .configureLogging(LogLevel.None)
      .build();

    connection.on('changed', () => this.reloadSoon());
    connection.onreconnecting(() => this.setLive(connection, false));
    connection.onreconnected(() => {
      this.setLive(connection, true);
      this.reloadSoon(); // catch up on anything missed
    });
    connection.onclose(() => this.setLive(connection, false));

    this.connection = connection;
    void this.connect(connection);
  }

  stop(): void {
    clearTimeout(this.pending);
    clearTimeout(this.retry);
    const connection = this.connection;
    this.connection = null;
    this.store.live.set(false);
    void connection?.stop();
  }

  private async connect(connection: HubConnection): Promise<void> {
    try {
      await connection.start();
      if (this.connection !== connection) return;
      this.setLive(connection, true);
      this.reloadSoon();
    } catch {
      if (this.connection === connection && this.auth.token) {
        this.retry = setTimeout(() => void this.connect(connection), RETRY_MS);
      }
    }
  }

  private setLive(connection: HubConnection, live: boolean): void {
    if (this.connection === connection) this.store.live.set(live);
  }

  /** One action can save several times; reload once for the burst. */
  private reloadSoon(): void {
    clearTimeout(this.pending);
    this.pending = setTimeout(() => {
      if (!this.auth.changingPassword) void this.store.refresh();
    }, 250);
  }
}
