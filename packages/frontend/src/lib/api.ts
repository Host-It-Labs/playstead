export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const configuredBase = import.meta.env.VITE_API_URL?.trim();
export const API_BASE = configuredBase ? configuredBase.replace(/\/$/, '') : '/api';

type RequestOptions = {
  body?: unknown;
  token?: string | null;
  method?: string;
  headers?: Record<string, string>;
};

export async function apiRequest<T>(
  path: string,
  { body, token, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? ((await response.json()) as unknown)
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'message' in payload
        ? Array.isArray(payload.message)
          ? payload.message.join('. ')
          : String(payload.message)
        : typeof payload === 'string' && payload
          ? payload
          : 'Playstead could not complete that request.';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export function unwrap<T>(value: T | { data: T }, key?: string): T {
  if (typeof value !== 'object' || value === null) return value as T;
  if ('data' in value) return value.data;
  if (key && key in value) return (value as Record<string, T>)[key];
  return value as T;
}

export function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Something wandered off course. Please try again.';
}
