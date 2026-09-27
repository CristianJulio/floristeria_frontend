const API_URL = import.meta.env.VITE_API_URL as string | undefined
if (!API_URL) throw new Error('VITE_API_URL is not set')

export type FieldError = { field: string; message: string }

export class ApiError extends Error {
  readonly status: number
  readonly errors: FieldError[]

  constructor(status: number, message: string, errors: FieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

// The access token lives only in memory; the refresh token is an httpOnly cookie the browser handles
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

// Called when the session can't be renewed, so the app can send the user to the login page
let sessionExpiredHandler: (() => void) | null = null

export function onSessionExpired(handler: (() => void) | null) {
  sessionExpiredHandler = handler
}

// Only one refresh at a time: the backend treats a refresh token used twice as stolen
// and ends every session of that user, so concurrent callers share the same request
let refreshInFlight: Promise<string | null> | null = null

export function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) return null

      const body = (await response.json()) as { data: { accessToken: string } }
      setAccessToken(body.data.accessToken)
      return body.data.accessToken
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(`${API_URL}${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }
  return url
}

async function send(path: string, options: RequestOptions) {
  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    },
    ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
  })
}

// Calls the API with the access token; on a 401 it renews the token once and retries.
// Returns the parsed JSON body ({ status, data, pagination? }); errors become ApiError
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options)

  const isAuthRequest = path.startsWith('/api/auth/login') || path.startsWith('/api/auth/refresh')
  if (response.status === 401 && !isAuthRequest) {
    const renewed = await refreshAccessToken()
    if (!renewed) {
      setAccessToken(null)
      sessionExpiredHandler?.()
      throw new ApiError(401, 'Unauthorized')
    }
    response = await send(path, options)
  }

  if (response.status === 204) return undefined as T

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(response.status, body.message ?? response.statusText, body.errors ?? [])
  }
  return body as T
}
