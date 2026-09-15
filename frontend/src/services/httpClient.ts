/**
 * The one place that knows how to talk to the backend over HTTP.
 *
 * The API is served under `/api`. In development Vite proxies that prefix to
 * the FastAPI dev server (see `vite.config.ts`), which keeps the session
 * cookie first-party: the backend sets a `SameSite=Lax` cookie, so a
 * cross-origin call would silently arrive without it.
 */
export const DEFAULT_API_BASE_URL = '/api'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

/** A non-2xx response, carrying the backend's `Error.message` for the UI to show. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  baseUrl: string
  method?: HttpMethod
  body?: unknown
}

/** Encodes an id so it can be dropped into a path segment. */
export function pathSegment(value: string): string {
  return encodeURIComponent(value)
}

/** Reads the API's error body (`{"message": "..."}`), falling back to the status line. */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown }
    if (typeof body.message === 'string' && body.message) return body.message
  } catch {
    // Missing or non-JSON body: the status line is the best description left.
  }
  return response.statusText || `Request failed with status ${response.status}`
}

/**
 * One JSON round-trip against the API. Credentials are always included, which
 * is what carries the session cookie; 204 responses resolve with no body.
 */
export async function apiRequest<T>(path: string, options: RequestOptions): Promise<T> {
  const { baseUrl, method = 'GET', body } = options
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) throw new ApiError(response.status, await readErrorMessage(response))
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
