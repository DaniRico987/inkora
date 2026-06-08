import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

type SessionTimeoutModalProps = {
  isOpen: boolean;
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
  isLogoutLoading?: boolean;
};

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function SessionTimeoutModal({
  isOpen,
  remainingSeconds,
  onExtend,
  onLogout,
  isLogoutLoading = false,
}: SessionTimeoutModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-end justify-center px-3 py-3 sm:items-center sm:px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-description"
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-bg-secondary p-4 shadow-2xl sm:p-6">
        <h2
          id="session-timeout-title"
          className="text-lg font-semibold text-text"
        >
          Tu sesion expirara pronto
        </h2>

        <p
          id="session-timeout-description"
          className="mt-2 text-sm text-text-muted"
        >
          Por inactividad, tu sesion se cerrara en{' '}
          <span className="font-semibold text-text">
            {formatCountdown(remainingSeconds)}
          </span>
          . Elige una opcion para continuar.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            variant="secondary"
            onClick={onLogout}
            loading={isLogoutLoading}
          >
            Cerrar sesion
          </Button>
          <Button variant="primary" onClick={onExtend}>
            Seguir conectado
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
