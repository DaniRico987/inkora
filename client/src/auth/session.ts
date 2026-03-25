export type UserRole = 'client' | 'admin' | 'root';

const TOKEN_KEY = 'inkora_access_token';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function saveAccessToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
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

export function isAuthenticated() {
  return Boolean(getAccessToken());
}
