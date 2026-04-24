export type UserRole = 'client' | 'admin' | 'root';

const TOKEN_KEY = 'inkora_access_token';
const TOKEN_CHANGED_EVENT = 'inkora:access-token-changed';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    if (padding === 2) base64 += '==';
    else if (padding === 3) base64 += '=';
    else if (padding === 1) return null;

    const decoded = atob(base64);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function saveAccessToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
}

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
}

export function subscribeToAccessTokenChanges(handler: () => void) {
  window.addEventListener(TOKEN_CHANGED_EVENT, handler);
  return () => window.removeEventListener(TOKEN_CHANGED_EVENT, handler);
}

export function getRoleFromToken(token?: string | null): UserRole | null {
  const currentToken = token ?? getAccessToken();
  if (!currentToken) {
    return null;
  }

  const payload = decodeJwtPayload(currentToken);
  if (!payload) {
    return null;
  }

  const role = payload.role;
  if (role === 'client' || role === 'admin' || role === 'root') {
    return role;
  }

  return null;
}

export function getIsTemporaryPasswordFromToken(token?: string | null): boolean {
  const currentToken = token ?? getAccessToken();
  if (!currentToken) {
    return false;
  }

  const payload = decodeJwtPayload(currentToken);
  return payload?.isTemporaryPassword === true;
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}
