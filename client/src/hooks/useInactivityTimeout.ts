import { useCallback, useEffect, useRef, useState } from 'react';
import { isAuthenticated } from '../auth/session';
import {
  SESSION_INACTIVITY_MS,
  SESSION_WARNING_MS,
} from '../auth/sessionConfig';

const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const;

const ACTIVITY_DEBOUNCE_MS = 1000;

type UseInactivityTimeoutOptions = {
  enabled: boolean;
  onWarning: () => void;
  onTimeout: () => void;
};

export function useInactivityTimeout({
  enabled,
  onWarning,
  onTimeout,
}: UseInactivityTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.floor(SESSION_WARNING_MS / 1000),
  );

  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const lastActivityRef = useRef(Date.now());
  const showWarningRef = useRef(showWarning);
  const onWarningRef = useRef(onWarning);
  const onTimeoutRef = useRef(onTimeout);

  showWarningRef.current = showWarning;

  onWarningRef.current = onWarning;
  onTimeoutRef.current = onTimeout;

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    setRemainingSeconds(Math.floor(SESSION_WARNING_MS / 1000));

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }, []);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    if (!enabled || !isAuthenticated()) {
      return;
    }

    const warningDelay = SESSION_INACTIVITY_MS - SESSION_WARNING_MS;

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      startCountdown();
      onWarningRef.current();
    }, warningDelay);

    logoutTimerRef.current = setTimeout(() => {
      setShowWarning(false);
      onTimeoutRef.current();
    }, SESSION_INACTIVITY_MS);
  }, [clearTimers, enabled, startCountdown]);

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    scheduleTimers();
  }, [scheduleTimers]);

  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!enabled || !isAuthenticated()) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    scheduleTimers();

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleActivity = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        if (!showWarning) {
          resetTimers();
        }
      }, ACTIVITY_DEBOUNCE_MS);
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !isAuthenticated()) {
        return;
      }

      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= SESSION_INACTIVITY_MS) {
        onTimeoutRef.current();
        return;
      }

      if (idleMs >= SESSION_INACTIVITY_MS - SESSION_WARNING_MS) {
        setShowWarning(true);
        const secondsLeft = Math.max(
          1,
          Math.ceil((SESSION_INACTIVITY_MS - idleMs) / 1000),
        );
        setRemainingSeconds(secondsLeft);
        startCountdown();
        onWarningRef.current();
        return;
      }

      resetTimers();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimers();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearTimers, enabled, resetTimers, scheduleTimers, startCountdown]);

  return {
    showWarning,
    remainingSeconds,
    extendSession,
  };
}
