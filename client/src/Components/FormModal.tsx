import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Spinner } from './Spinner';

export interface FormModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading?: boolean;
  submitText?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function FormModal({
  isOpen,
  title,
  onClose,
  onSubmit,
  isLoading = false,
  submitText = 'Guardar',
  children,
  size = 'md',
}: FormModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  if (!isOpen) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
  }[size];

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-end justify-center px-3 py-3 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />

      <div
        className={`relative w-full ${sizeClass} rounded-2xl border border-border bg-bg-secondary p-4 shadow-2xl sm:p-6 max-h-[88vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-text">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-border rounded-lg transition-colors text-text-muted hover:text-text"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner />
            </div>
          ) : (
            children
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg border border-border text-text hover:bg-border transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <div className="flex-1">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  isLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                {isLoading && <Spinner />}
                {submitText}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
