import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';
import type {
  ShowSnackbarInput,
  SnackbarConfig,
  SnackbarPosition,
  SnackbarStatus,
} from '../interfaces/SnackbarInterface';
import { SnackbarItem, type SnackbarItemModel } from './Snackbar';

type SnackbarContextValue = {
  showSnackbar: (input: ShowSnackbarInput) => void;
  info: (
    message: string,
    opts?: Omit<ShowSnackbarInput, 'message' | 'status'>,
  ) => void;
  success: (
    message: string,
    opts?: Omit<ShowSnackbarInput, 'message' | 'status'>,
  ) => void;
  warning: (
    message: string,
    opts?: Omit<ShowSnackbarInput, 'message' | 'status'>,
  ) => void;
  error: (
    message: string,
    opts?: Omit<ShowSnackbarInput, 'message' | 'status'>,
  ) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

function posClasses(position: SnackbarPosition) {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4 items-start';
    case 'top-center':
      return 'top-4 left-1/2 -translate-x-1/2 items-center';
    case 'top-right':
      return 'top-4 right-4 items-end';
    case 'bottom-left':
      return 'bottom-4 left-4 items-start';
    case 'bottom-right':
      return 'bottom-4 right-4 items-end';
    case 'bottom-center':
    default:
      return 'bottom-4 left-1/2 -translate-x-1/2 items-center';
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type InternalSnack = SnackbarItemModel & {
  dedupeKey: string;
};

export function SnackbarProvider({
  children,
  config,
}: PropsWithChildren<{ config?: SnackbarConfig }>) {
  const position = config?.position ?? 'top-center';
  const maxVisible = config?.maxVisible ?? 3;
  const maxQueue = config?.maxQueue ?? 20;
  const dedupeWindowMs = config?.dedupeWindowMs ?? 1500;

  const [snacks, setSnacks] = useState<InternalSnack[]>([]);
  const lastShownRef = useRef<Map<string, number>>(new Map());

  const close = useCallback((id: string) => {
    setSnacks((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const showSnackbar = useCallback(
    ({ message, status, durationMs, dedupeKey }: ShowSnackbarInput) => {
      const now = Date.now();
      const key = (dedupeKey ?? `${status}:${message}`).trim();
      const lastShownAt = lastShownRef.current.get(key) ?? 0;

      setSnacks((prev) => {
        // Deduplica si es el mismo mensaje/estado en ventana corta
        const idx = prev.findIndex((s) => s.dedupeKey === key);
        if (idx >= 0 && now - lastShownAt <= dedupeWindowMs) {
          const next = [...prev];
          const existing = next[idx];
          next[idx] = {
            ...existing,
            count: existing.count + 1,
            createdAtMs: now,
            durationMs: durationMs ?? existing.durationMs,
          };
          lastShownRef.current.set(key, now);
          return next;
        }

        const nextSnack: InternalSnack = {
          id: makeId(),
          message,
          status,
          createdAtMs: now,
          durationMs: durationMs ?? 3500,
          count: 1,
          dedupeKey: key,
        };

        // Evita saturación: recorta pendientes si superan maxQueue
        const maxTotal = maxVisible + maxQueue;
        const base =
          prev.length >= maxTotal
            ? prev.slice(prev.length - (maxTotal - 1))
            : prev;
        lastShownRef.current.set(key, now);
        return [...base, nextSnack];
      });
    },
    [dedupeWindowMs, maxQueue, maxVisible],
  );

  const makeQuick = useCallback(
    (status: SnackbarStatus) =>
      (message: string, opts?: Omit<ShowSnackbarInput, 'message' | 'status'>) =>
        showSnackbar({ message, status, ...opts }),
    [showSnackbar],
  );

  const value = useMemo<SnackbarContextValue>(
    () => ({
      showSnackbar,
      info: makeQuick('info'),
      success: makeQuick('success'),
      warning: makeQuick('warning'),
      error: makeQuick('error'),
    }),
    [makeQuick, showSnackbar],
  );

  const visible = snacks.slice(Math.max(0, snacks.length - maxVisible));

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <div
        className={[
          'fixed z-99999',
          'flex flex-col gap-2',
          'pointer-events-none',
          posClasses(position),
        ].join(' ')}
      >
        {visible.map((item) => (
          <SnackbarItem key={item.id} item={item} onClose={close} />
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx)
    throw new Error('useSnackbar debe usarse dentro de <SnackbarProvider />');
  return ctx;
}
