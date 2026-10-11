import type { ApiErrorBody, ApiResponse, AuthResponse, Paginated } from '@kmg/shared';

import { emitAuthLogout, tokenStore } from '@/lib/auth/token-store';
import { API_BASE_PATH } from '@/lib/env';

/* -------------------------------------------------------------------------- */
/* Errors                                                                      */
/* -------------------------------------------------------------------------- */

/** Thrown by every browser API call that does not return 2xx. */
export class ApiError extends Error {
  readonly status: number;
  readonly body?: ApiErrorBody;
  readonly details: NonNullable<ApiErrorBody['details']>;

  constructor(status: number, message: string, body?: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.details = body?.details ?? [];
  }

  /** `{ email: 'Enter a valid email' }` — feed straight into RHF `setError`. */
  get fieldErrors(): Record<string, string> {
    return this.details.reduce<Record<string, string>>((acc, detail) => {
      if (detail.path && !acc[detail.path]) acc[detail.path] = detail.message;
      return acc;
    }, {});
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isValidation() {
    return this.status === 400 || this.status === 422;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Human-friendly message for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (isApiError(error)) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/* -------------------------------------------------------------------------- */
/* Request plumbing                                                            */
/* -------------------------------------------------------------------------- */

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  /** Query parameters appended to the URL (empty values are dropped). */
  query?: Record<string, unknown>;
  /** JSON body (ignored when `body` is a FormData/BodyInit). */
  json?: unknown;
  body?: BodyInit | null;
  /** Skip the automatic 401 → refresh → retry dance (used by auth endpoints). */
  skipAuthRefresh?: boolean;
}

const CSRF_HEADER = { 'X-Requested-With': 'XMLHttpRequest' } as const;

/** Endpoints that authenticate with the refresh cookie and therefore need the CSRF header. */
function needsCsrfHeader(path: string) {
  return path.startsWith('/auth/refresh') || path.startsWith('/auth/logout');
}

function buildUrl(path: string, query?: Record<string, unknown>) {
  const url = `${API_BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | undefined;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = undefined;
  }
  const message =
    body?.message ||
    (response.status === 401
      ? 'Your session has expired. Please sign in again.'
      : response.status === 403
        ? 'You do not have permission to do that.'
        : response.status === 404
          ? 'Not found.'
          : 'Request failed. Please try again.');
  return new ApiError(response.status, message, body);
}

/* -------------------------------------------------------------------------- */
/* Single-flight refresh                                                       */
/* -------------------------------------------------------------------------- */

let refreshPromise: Promise<AuthResponse | null> | null = null;

/**
 * Exchange the httpOnly refresh cookie for a new access token.
 * Concurrent callers share a single in-flight request.
 */
export function refreshAccessToken(): Promise<AuthResponse | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_PATH}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...CSRF_HEADER, Accept: 'application/json' },
      });
      if (!response.ok) {
        tokenStore.clear();
        return null;
      }
      const payload = (await response.json()) as ApiResponse<AuthResponse> | AuthResponse;
      const auth = 'data' in payload ? payload.data : payload;
      tokenStore.set(auth.accessToken, auth.expiresIn, auth.user);
      return auth;
    } catch {
      tokenStore.clear();
      return null;
    } finally {
      // Release the lock on the next tick so retries reuse the fresh token.
      setTimeout(() => {
        refreshPromise = null;
      }, 0);
    }
  })();

  return refreshPromise;
}

/** Reset module state — test helper. */
export function __resetRefreshState() {
  refreshPromise = null;
}

/* -------------------------------------------------------------------------- */
/* Core request                                                                */
/* -------------------------------------------------------------------------- */

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { query, json, skipAuthRefresh, headers, ...init } = options;

  const send = async (): Promise<Response> => {
    const requestHeaders = new Headers(headers as HeadersInit | undefined);
    requestHeaders.set('Accept', 'application/json');
    if (json !== undefined && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }
    const token = tokenStore.get();
    if (token && !requestHeaders.has('Authorization')) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
    if (needsCsrfHeader(path)) {
      requestHeaders.set('X-Requested-With', 'XMLHttpRequest');
    }
    return fetch(buildUrl(path, query), {
      ...init,
      method,
      credentials: 'include',
      headers: requestHeaders,
      body: json !== undefined ? JSON.stringify(json) : (init.body ?? undefined),
    });
  };

  let response: Response;
  try {
    response = await send();
  } catch {
    throw new ApiError(0, 'Network error — please check your connection and try again.');
  }

  // 401 → refresh once, then retry the original request exactly once.
  if (response.status === 401 && !skipAuthRefresh && !needsCsrfHeader(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      try {
        response = await send();
      } catch {
        throw new ApiError(0, 'Network error — please check your connection and try again.');
      }
    } else {
      emitAuthLogout();
    }
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return (await response.text()) as unknown as T;
  }
  return (await response.json()) as T;
}

export interface UploadOptions {
  /** 0–100 progress callback (uses XHR — `fetch` cannot report upload progress). */
  onProgress?: (percent: number) => void;
  method?: 'POST' | 'PATCH' | 'PUT';
  signal?: AbortSignal;
}

function uploadOnce<T>(path: string, formData: FormData, options: UploadOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method ?? 'POST', buildUrl(path));
    xhr.withCredentials = true;
    xhr.setRequestHeader('Accept', 'application/json');
    const token = tokenStore.get();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Upload failed — please check your connection.'));
    xhr.onabort = () => reject(new ApiError(0, 'Upload cancelled.'));
    xhr.onload = () => {
      const raw = xhr.responseText;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(raw ? (JSON.parse(raw) as T) : (undefined as T));
        } catch {
          resolve(undefined as T);
        }
        return;
      }
      let body: ApiErrorBody | undefined;
      try {
        body = raw ? (JSON.parse(raw) as ApiErrorBody) : undefined;
      } catch {
        body = undefined;
      }
      reject(new ApiError(xhr.status, body?.message ?? 'Upload failed.', body));
    };
    options.signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(formData);
  });
}

/* -------------------------------------------------------------------------- */
/* Public surface                                                              */
/* -------------------------------------------------------------------------- */

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, json?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, json }),
  patch: <T>(path: string, json?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, json }),
  put: <T>(path: string, json?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, json }),
  delete: <T = void>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),

  /** multipart/form-data upload with progress. Retries once after a 401 refresh. */
  async upload<T>(path: string, formData: FormData, options: UploadOptions = {}): Promise<T> {
    try {
      return await uploadOnce<T>(path, formData, options);
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) return uploadOnce<T>(path, formData, options);
        emitAuthLogout();
      }
      throw error;
    }
  },

  /** `GET` returning the `{ data }` envelope unwrapped. */
  async getData<T>(path: string, options?: RequestOptions): Promise<T> {
    const response = await request<ApiResponse<T>>('GET', path, options);
    return response.data;
  },

  /** `GET` returning a paginated list (`{ data, meta }`) as-is. */
  getList: <T>(path: string, options?: RequestOptions) => request<Paginated<T>>('GET', path, options),

  /** `POST` returning the `{ data }` envelope unwrapped. */
  async postData<T>(path: string, json?: unknown, options?: RequestOptions): Promise<T> {
    const response = await request<ApiResponse<T>>('POST', path, { ...options, json });
    return response.data;
  },

  /** `PATCH` returning the `{ data }` envelope unwrapped. */
  async patchData<T>(path: string, json?: unknown, options?: RequestOptions): Promise<T> {
    const response = await request<ApiResponse<T>>('PATCH', path, { ...options, json });
    return response.data;
  },

  /** `PUT` returning the `{ data }` envelope unwrapped. */
  async putData<T>(path: string, json?: unknown, options?: RequestOptions): Promise<T> {
    const response = await request<ApiResponse<T>>('PUT', path, { ...options, json });
    return response.data;
  },
};

export type ApiClient = typeof api;
