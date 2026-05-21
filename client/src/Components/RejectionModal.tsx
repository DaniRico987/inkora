import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

export interface RejectionModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  initialNote?: string;
  confirmText?: string;
  cancelText?: string;
  onCancel: () => void;
  onConfirm: (note?: string) => void;
  isConfirmLoading?: boolean;
}

export function RejectionModal({
  isOpen,
  title = 'Rechazar solicitud',
  message,
  initialNote = '',
  confirmText = 'Rechazar',
  cancelText = 'Cancelar',
  onCancel,
  onConfirm,
  isConfirmLoading = false,
}: RejectionModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <RejectionModalContent
      title={title}
      message={message}
      initialNote={initialNote}
      confirmText={confirmText}
      cancelText={cancelText}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isConfirmLoading={isConfirmLoading}
    />,
    document.body,
  );
}

function RejectionModalContent({
  title,
  message,
  initialNote,
  confirmText,
  cancelText,
  onCancel,
  onConfirm,
  isConfirmLoading,
}: Omit<RejectionModalProps, 'isOpen'>) {
  const [note, setNote] = useState(initialNote || '');

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-end justify-center px-3 py-3 sm:items-center sm:px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" onClick={onCancel} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-bg-secondary p-4 shadow-2xl sm:p-6 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        {message ? <p className="mt-2 text-sm text-text-muted">{message}</p> : null}

        <label className="mt-4 block text-sm font-medium text-text-muted">Comentario del administrador (opcional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none"
        />

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button variant="secondary" onClick={onCancel}>{cancelText}</Button>
          <Button variant="destructive" onClick={() => onConfirm(note.trim() || undefined)} loading={isConfirmLoading}>{confirmText}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
