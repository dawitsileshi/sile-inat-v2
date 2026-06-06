import { ANONYMOUS_HEADER, getAnonymousClientId } from './clientId';

const API_URL = '/api';

export async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

export function anonymousHeaders(extra: HeadersInit = {}): HeadersInit {
  return {
    'Content-Type': 'application/json',
    [ANONYMOUS_HEADER]: getAnonymousClientId(),
    ...extra,
  };
}

export { API_URL };
