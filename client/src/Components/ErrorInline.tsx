import { useEffect, useMemo, useRef, useState } from "react";
import type { ErrorInlineProps } from "../interfaces/ErrorInlineInterface";

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function formatRemaining(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return hours > 0 ? `${hours}:${pad2(minutes)}:${pad2(seconds)}` : `${pad2(minutes)}:${pad2(seconds)}`;
}

const errorText = "text-sm text-red-500";

export function ErrorInLine({
  title = "Tu cuenta ha sido bloqueada temporalmente por seguridad.",
  failedAttempts,
  className = "",
  countdown,
  countdownLabel = "Tiempo restante:",
  onExpire,
}: ErrorInlineProps) {
  const initialSeconds = useMemo(() => {
    if (!countdown) return null;
    if (typeof (countdown as { seconds?: unknown }).seconds === "number") {
      return Math.max(0, Math.floor((countdown as { seconds: number }).seconds));
    }
    if (typeof (countdown as { expiresAtMs?: unknown }).expiresAtMs === "number") {
      const delta = Math.ceil(((countdown as { expiresAtMs: number }).expiresAtMs - Date.now()) / 1000);
      return Math.max(0, delta);
    }
    return null;
  }, [countdown]);

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(initialSeconds);
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

  const timeText = remainingSeconds !== null ? formatRemaining(remainingSeconds) : null;

  return (
    <div
      role="alert"
      className={[
        "w-full",
        "transition-all duration-200",
        className,
      ].join(" ")}
    >
      <div className={`${errorText} leading-5 wrap-break-word`}>{title}</div>
      {failedAttempts && (
        <div className={`${errorText} leading-5 wrap-break-word mt-0.5`}>
          Intentos fallidos: {failedAttempts.current}/{failedAttempts.max}
        </div>
      )}
      {timeText && (
        <div className={`${errorText} leading-5 wrap-break-word mt-0.5`}>
          {countdownLabel} {timeText}
        </div>
      )}
    </div>
  );
}

