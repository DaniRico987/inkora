import { useEffect, useMemo, useRef, useState } from 'react';
import type { ErrorInlineProps } from '../interfaces/ErrorInlineInterface';

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

function formatRemaining(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return hours > 0
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    : `${pad2(minutes)}:${pad2(seconds)}`;
}

export function ErrorInLine({
  title = 'Tu cuenta ha sido bloqueada temporalmente por seguridad.',
  failedAttempts,
  className = '',
  countdown,
  countdownLabel = 'Tiempo restante:',
  onExpire,
}: ErrorInlineProps) {
  const initialSeconds = useMemo(() => {
    if (!countdown) return null;
    if (typeof (countdown as { seconds?: unknown }).seconds === 'number') {
      return Math.max(
        0,
        Math.floor((countdown as { seconds: number }).seconds),
      );
    }
    if (
      typeof (countdown as { expiresAtMs?: unknown }).expiresAtMs === 'number'
    ) {
      const delta = Math.ceil(
        ((countdown as { expiresAtMs: number }).expiresAtMs - Date.now()) /
          1000,
      );
      return Math.max(0, delta);
    }
    return null;
  }, [countdown]);

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    initialSeconds,
  );
  const expiredRef = useRef(false);

  useEffect(() => {
    setRemainingSeconds(initialSeconds);
    expiredRef.current = false;
  }, [initialSeconds]);

  useEffect(() => {
    if (remainingSeconds === null) return;
    if (remainingSeconds <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
      return;
    }
    const id = window.setInterval(() => {
      setRemainingSeconds((s) => (s === null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [remainingSeconds, onExpire]);

  const timeText =
    remainingSeconds !== null ? formatRemaining(remainingSeconds) : null;

  return (
    <div
      role="alert"
      className={[
        'w-full',
        'rounded-xl border border-red-200 bg-red-50/60',
        'text-left',
        'transition-all duration-200',
        'p-3.5 sm:p-4',
        className,
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 border-l-2 border-red-200 pl-3">
          <p className="text-sm sm:text-[0.95rem] font-medium leading-6 text-red-600 wrap-break-word">
            {title}
          </p>

          <div className="mt-1.5 space-y-1">
            {failedAttempts && (
              <p className="text-xs sm:text-sm text-red-600">
                Intentos fallidos: {failedAttempts.current}/{failedAttempts.max}
              </p>
            )}

            {timeText && (
              <p className="text-xs sm:text-sm text-text-muted">
                {countdownLabel} {timeText}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
