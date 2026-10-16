import { api, bindSession } from './api';

type SessionBody = { access_token: string; expires_in: number; email: string };

class Auth {
  email = $state<string | null>(null);
  ready = $state(false);
  needsSetup = $state(false);
  #accessToken: string | null = null;
  #refreshing: Promise<boolean> | null = null;
  #onLogout: () => void = () => {};

  get signedIn() {
    return this.email !== null;
  }

  init(onLogout: () => void) {
    this.#onLogout = onLogout;
    bindSession({
      accessToken: () => this.#accessToken,
      refresh: () => this.refresh(),
      onUnauthorized: () => this.#forget(),
    });
  }

  /** Restores the session from the refresh cookie on page load. */
  async restore() {
    const status = await api.get<{ needs_setup: boolean }>('/auth/status');
    this.needsSetup = status.needs_setup;
    if (!this.needsSetup) await this.refresh();
    this.ready = true;
  }

  async login(email: string, password: string) {
    this.#accept(await api.post<SessionBody>('/auth/login', { email, password }, { anonymous: true }));
  }

  async setup(email: string, password: string) {
    this.#accept(await api.post<SessionBody>('/auth/setup', { email, password }, { anonymous: true }));
    this.needsSetup = false;
  }

  refresh(): Promise<boolean> {
    // Concurrent 401s share one refresh.
    this.#refreshing ??= api
      .post<SessionBody>('/auth/refresh', undefined, { anonymous: true })
      .then((s) => {
        this.#accept(s);
        return true;
      })
      .catch(() => false)
      .finally(() => (this.#refreshing = null));
    return this.#refreshing;
  }

  async logout() {
    await api.post('/auth/logout', undefined, { anonymous: true }).catch(() => {});
    this.#forget();
  }

  #accept(s: SessionBody) {
    this.#accessToken = s.access_token;
    this.email = s.email;
  }

  #forget() {
    this.#accessToken = null;
    this.email = null;
    this.#onLogout();
  }
}

export const auth = new Auth();
