import { API_BASE, api, bindSession } from './api';

type SessionBody = { access_token: string; expires_in: number; email: string };

class Auth {
  email = $state<string | null>(null);
  ready = $state(false);
  google = $state(false);
  /** Opened by navigation, not fetch: Google sends the browser back through the API. */
  readonly googleSignInUrl = `${API_BASE}/auth/google`;
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
    const status = await api.get<{ google: boolean }>('/auth/status');
    this.google = status.google;
    await this.refresh();
    this.ready = true;
  }

  async login(email: string, password: string) {
    this.#accept(await api.post<SessionBody>('/auth/login', { email, password }, { anonymous: true }));
  }

  async register(email: string, password: string) {
    this.#accept(await api.post<SessionBody>('/auth/register', { email, password }, { anonymous: true }));
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
