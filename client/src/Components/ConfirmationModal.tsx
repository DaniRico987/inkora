import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import type { ConfirmationModalProps } from '../interfaces/ConfirmationModalInterface';

export function ConfirmationModal({
  isOpen,
  message,
  onCancel,
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  title = 'Confirmar accion',
  closeOnBackdropClick = true,
  isConfirmLoading = false,
}: ConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-end justify-center px-3 py-3 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      onClick={() => {
        if (closeOnBackdropClick) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />

      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-bg-secondary p-4 shadow-2xl sm:p-6 max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirmation-modal-title"
          className="text-lg font-semibold text-text"
        >
          {title}
        </h2>

        <p className="mt-2 text-sm text-text-muted wrap-break-word">{message}</p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={isConfirmLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
