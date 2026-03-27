import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

type AuthHomeButtonProps = {
  to?: string;
  className?: string;
};

const AUTH_RETURN_TO_KEY = 'inkora.auth.returnTo';

function isAuthPath(path: string): boolean {
  return (
    path === '/login' ||
    path === '/register' ||
    path === '/forgot-password' ||
    path.startsWith('/reset-password')
  );
}

function sanitizeInternalPath(path?: string | null): string | undefined {
  if (!path) {
    return undefined;
  }

  const normalizedPath = path.trim();
  if (!normalizedPath || !normalizedPath.startsWith('/') || normalizedPath.startsWith('//')) {
    return undefined;
  }

  const parsed = new URL(normalizedPath, window.location.origin);
  if (isAuthPath(parsed.pathname)) {
    return undefined;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function getReferrerPath(): string | undefined {
  try {
    if (!document.referrer) {
      return undefined;
    }

    const referrer = new URL(document.referrer);
    if (referrer.origin !== window.location.origin) {
      return undefined;
    }

    return `${referrer.pathname}${referrer.search}${referrer.hash}`;
  } catch {
    return undefined;
  }
}

export function AuthHomeButton({ to, className = '' }: AuthHomeButtonProps) {
  const location = useLocation();

  const stateFrom =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state &&
    typeof (location.state as { from?: unknown }).from === 'string'
      ? (location.state as { from: string }).from
      : undefined;

  const fromQuery = new URLSearchParams(location.search).get('from');
  const referrerPath = getReferrerPath();

  const target = useMemo(() => {
    const savedTarget = sessionStorage.getItem(AUTH_RETURN_TO_KEY);

    return (
      sanitizeInternalPath(to) ||
      sanitizeInternalPath(stateFrom) ||
      sanitizeInternalPath(fromQuery) ||
      sanitizeInternalPath(savedTarget) ||
      sanitizeInternalPath(referrerPath) ||
      '/catalog'
    );
  }, [to, stateFrom, fromQuery, referrerPath]);

  useEffect(() => {
    sessionStorage.setItem(AUTH_RETURN_TO_KEY, target);
  }, [target]);

  return (
    <Link
      to={target}
      aria-label="Volver al catalogo"
      title="Volver al catalogo"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-input text-text transition-colors hover:border-primary-500 hover:text-primary-500 ${className}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M10 21v-6h4v6" />
      </svg>
      <span className="sr-only">Volver al catalogo</span>
    </Link>
  );
}
