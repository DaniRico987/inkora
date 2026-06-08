import { useCallback, useEffect, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { logoutSession, registerLogoutServices } from '../auth/logoutSession';
import { isAuthenticated, subscribeToAccessTokenChanges } from '../auth/session';
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';
import { SessionTimeoutModal } from './SessionTimeoutModal';

type SessionManagerProps = {
  queryClient: QueryClient;
  children: React.ReactNode;
};

const PUBLIC_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }
  return pathname.startsWith('/reset-password');
}

export function SessionManager({ queryClient, children }: SessionManagerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(isAuthenticated);

  useEffect(() => {
    return subscribeToAccessTokenChanges(() => {
      setAuthenticated(isAuthenticated());
    });
  }, []);

  useEffect(() => {
    registerLogoutServices({
      queryClient,
      navigate: (path) => navigate(path, { replace: true }),
    });
  }, [navigate, queryClient]);

  const handleInactivityTimeout = useCallback(() => {
    void logoutSession({ reason: 'inactivity' });
  }, []);

  const { showWarning, remainingSeconds, extendSession } = useInactivityTimeout({
    enabled: authenticated && !isPublicPath(location.pathname),
    onWarning: () => {},
    onTimeout: handleInactivityTimeout,
  });

  const handleLogout = async () => {
    setIsLogoutLoading(true);
    try {
      await logoutSession({ reason: 'manual' });
    } finally {
      setIsLogoutLoading(false);
    }
  };

  return (
    <>
      {children}
      <SessionTimeoutModal
        isOpen={showWarning}
        remainingSeconds={remainingSeconds}
        onExtend={extendSession}
        onLogout={handleLogout}
        isLogoutLoading={isLogoutLoading}
      />
    </>
  );
}
