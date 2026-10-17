import { apiErrorMessage } from './i18n.svelte';
import type { Problem } from './types';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Session = {
  accessToken: () => string | null;
  refresh: () => Promise<boolean>;
  onUnauthorized: () => void;
};

let session: Session | null = null;

export function bindSession(s: Session) {
  session = s;
}

type Options = {
  body?: unknown;
  form?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** The auth calls themselves must not trigger a refresh-and-retry. */
  anonymous?: boolean;
};

async function send<T>(method: string, path: string, opts: Options, retried = false): Promise<T> {
  const url = new URL(API_BASE + path, window.location.origin);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== '' && v !== false) url.searchParams.set(k, String(v));
  }
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = session?.accessToken();
  if (token && !opts.anonymous) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'network', apiErrorMessage('network'));
  }

  if (response.status === 401 && !opts.anonymous && !retried && session) {
    if (await session.refresh()) return send<T>(method, path, opts, true);
    session.onUnauthorized();
  }
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let data: unknown = undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // A proxy error page is not JSON; the status says enough.
  }
  if (!response.ok) throw toApiError(response.status, data);
  return data as T;
}

function toApiError(status: number, data: unknown): ApiError {
  const problem = (data ?? {}) as Partial<Problem>;
  const code = typeof problem.code === 'string' ? problem.code : 'internal_error';
  const fields: Record<string, string> = {};
  for (const e of problem.errors ?? []) {
    if (e?.location && e.message) fields[e.location] = e.message;
  }
  return new ApiError(status, code, apiErrorMessage(code), fields);
}

export const api = {
  get: <T>(path: string, query?: Options['query']) => send<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, opts: Omit<Options, 'body'> = {}) =>
    send<T>('POST', path, { ...opts, body }),
  put: <T>(path: string, body: unknown) => send<T>('PUT', path, { body }),
  patch: <T>(path: string, body: unknown) => send<T>('PATCH', path, { body }),
  delete: (path: string) => send<void>('DELETE', path, {}),
  upload: <T>(path: string, file: File, query?: Options['query'], fields: Record<string, string> = {}) => {
    const form = new FormData();
    form.append('file', file);
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    return send<T>('POST', path, { form, query });
  },
};
