// One typed request function shared between apps/web and apps/mobile,
// parameterized by base URL and auth-header injection (cookie-based for
// web — the browser sends the httpOnly cookie automatically on same-origin
// requests, so web needs no getAuthHeaders at all — Bearer-token-based for
// mobile, via getAuthHeaders reading from SecureStore).
//
// Encapsulates the fetch + res.ok + data.error pattern every
// apps/web/src/components/*Manager.tsx previously repeated by hand. This is
// also the choke point where the mobile offline outbox gets wired in later.

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface ApiClientOptions {
  /** Prefixed to every path. Leave empty for same-origin (web); mobile passes an absolute URL. */
  baseUrl?: string;
  /** Extra headers (e.g. Authorization: Bearer ...) to attach to every request. */
  getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
}

async function request<T>(
  baseUrl: string,
  getAuthHeaders: ApiClientOptions['getAuthHeaders'],
  path: string,
  init: RequestInit,
  fallbackErrorMessage: string
): Promise<T> {
  const authHeaders = getAuthHeaders ? await getAuthHeaders() : undefined;

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    let message = fallbackErrorMessage;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // Non-JSON error body — keep the fallback message.
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? '';

  return {
    get: <T>(path: string, fallbackErrorMessage = 'Request failed') =>
      request<T>(baseUrl, options.getAuthHeaders, path, { method: 'GET' }, fallbackErrorMessage),

    post: <T>(path: string, body?: unknown, fallbackErrorMessage = 'Request failed') =>
      request<T>(
        baseUrl,
        options.getAuthHeaders,
        path,
        { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined },
        fallbackErrorMessage
      ),

    put: <T>(path: string, body?: unknown, fallbackErrorMessage = 'Request failed') =>
      request<T>(
        baseUrl,
        options.getAuthHeaders,
        path,
        { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined },
        fallbackErrorMessage
      ),

    delete: <T>(path: string, fallbackErrorMessage = 'Request failed') =>
      request<T>(baseUrl, options.getAuthHeaders, path, { method: 'DELETE' }, fallbackErrorMessage),
  };
}

// Web default: relative URLs, cookie auth handled automatically by the browser.
export const webApiClient = createApiClient();
