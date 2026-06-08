import type { QueryClient } from '@tanstack/react-query';
import { clearAccessToken, getAccessToken } from './session';
import { SESSION_STORAGE_KEYS } from './sessionConfig';

export type LogoutReason = 'manual' | 'expired' | 'inactivity';

export type LogoutSessionOptions = {
  reason?: LogoutReason;
  skipServerCall?: boolean;
};

let queryClientRef: QueryClient | null = null;
let navigateRef: ((path: string) => void) | null = null;
let isLoggingOut = false;

export function registerLogoutServices(services: {
  queryClient: QueryClient;
  navigate: (path: string) => void;
}) {
  queryClientRef = services.queryClient;
  navigateRef = services.navigate;
}

function clearSessionData() {
  clearAccessToken();
  sessionStorage.removeItem(SESSION_STORAGE_KEYS.authReturnTo);
  sessionStorage.removeItem(SESSION_STORAGE_KEYS.reservationCartMap);
  queryClientRef?.clear();
}

function redirectToLogin(reason: LogoutReason) {
  const path = `/login?reason=${reason}`;
  if (navigateRef) {
    navigateRef(path);
    return;
  }
  window.location.replace(path);
}

export async function logoutSession(options: LogoutSessionOptions = {}) {
  if (isLoggingOut) {
    return;
  }

  const { reason = 'manual', skipServerCall = false } = options;
  isLoggingOut = true;

  const token = getAccessToken();

  if (token && !skipServerCall) {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Token may already be invalid; continue with local cleanup.
    }
  }

  clearSessionData();
  redirectToLogin(reason);
}

export function handleUnauthorizedResponse(requestUrl?: string) {
  if (!getAccessToken()) {
    return;
  }

  if (!shouldHandleUnauthorized(requestUrl)) {
    return;
  }

  void logoutSession({ reason: 'expired', skipServerCall: true });
}

function shouldHandleUnauthorized(requestUrl?: string): boolean {
  if (!requestUrl) {
    return true;
  }

  const publicAuthPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/logout',
  ];

  return !publicAuthPaths.some((path) => requestUrl.includes(path));
}
