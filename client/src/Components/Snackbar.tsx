import { useEffect, useMemo, useRef, useState } from "react";
import type { SnackbarStatus } from "../interfaces/SnackbarInterface";

export type SnackbarItemModel = {
  id: string;
  message: string;
  status: SnackbarStatus;
  createdAtMs: number;
  durationMs: number;
  count: number;
};

function statusStyles(status: SnackbarStatus) {
  switch (status) {
    case "success":
      return { ring: "ring-emerald-500/30", icon: "text-emerald-500", bar: "bg-emerald-500" };
    case "warning":
      return { ring: "ring-amber-500/30", icon: "text-amber-500", bar: "bg-amber-500" };
    case "info":
      return { ring: "ring-skyblue-500/30", icon: "text-skyblue-500", bar: "bg-skyblue-500" };
    case "error":
    default:
      return { ring: "ring-red-500/30", icon: "text-red-500", bar: "bg-red-500" };
  }
}

function StatusIcon({ status, className }: { status: SnackbarStatus; className?: string }) {
  const cls = `${statusStyles(status).icon} ${className ?? ""}`;
  if (status === "success") {
    return (
      <svg className={cls} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "warning") {
    return (
      <svg className={cls} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M10.3 4.5h3.4L22 20H2L10.3 4.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "info") {
    return (
      <svg className={cls} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 16v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 8h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg className={cls} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function SnackbarItem({
  item,
  onClose,
}: {
  item: SnackbarItemModel;
  onClose: (id: string) => void;
}) {
  const { id, message, status, durationMs, count } = item;
  const s = statusStyles(status);

  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [paused, setPaused] = useState(false);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    lastTickRef.current = null;
    const timeoutId = window.setTimeout(() => {
      setRemainingMs(durationMs);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [durationMs, id]);

  useEffect(() => {
    if (paused) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      const last = lastTickRef.current ?? now;
      lastTickRef.current = now;
      const delta = Math.max(0, now - last);
      setRemainingMs((ms) => Math.max(0, ms - delta));
    }, 80);
    return () => window.clearInterval(interval);
  }, [paused]);

  useEffect(() => {
    if (remainingMs <= 0) onClose(id);
  }, [remainingMs, id, onClose]);

  const progress = useMemo(() => {
    if (durationMs <= 0) return 0;
    return Math.max(0, Math.min(1, remainingMs / durationMs));
  }, [remainingMs, durationMs]);

  return (
    <div
      className={[
        "pointer-events-auto",
        "w-[min(92vw,28rem)]",
        "rounded-2xl",
        "bg-bg-secondary/95",
        "border border-border",
        "shadow-xl",
        "backdrop-blur",
        "ring-1",
        s.ring,
        "overflow-hidden",
      ].join(" ")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <StatusIcon status={status} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="text-sm text-text leading-5 wrap-break-word">
            {message}
          </div>
          {count > 1 && (
            <div className="mt-1 text-xs text-text-muted">
              Se repitió <span className="font-semibold text-text">{count}</span> veces
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Cerrar"
          className="shrink-0 text-text-muted hover:text-text transition"
          onClick={() => onClose(id)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="h-1 bg-border/60">
        <div
          className={`h-full ${s.bar} transition-[width] duration-75 ease-linear`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}

