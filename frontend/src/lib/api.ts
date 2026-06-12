import { ANONYMOUS_HEADER, getAnonymousClientId } from './clientId';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export async function parseResponse<T>(response: Response): Promise<T> {
  // Read as text first so an empty body (Render worker timeout, 502/504 from
  // the proxy, etc.) doesn't blow up as "Unexpected end of JSON input".
  const raw = await response.text();

  let data: any = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      if (response.ok) {
        throw new Error('The server returned an unexpected response. Please try again.');
      }
    }
  }

  if (!response.ok) {
    const message =
      (data && typeof data.error === 'string' && data.error) ||
      (response.status === 504 || response.status === 502
        ? 'The server took too long to respond. Please try again in a moment.'
        : `Request failed (${response.status})`);
    throw new Error(message);
  }

  if (data === null) {
    throw new Error('The server returned an empty response. Please try again.');
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
