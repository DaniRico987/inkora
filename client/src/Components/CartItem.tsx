import React, { useState } from 'react';
import { Spinner } from './Spinner';
import type { CartItem as CartItemType } from '../interfaces/CartInterface';

interface CartItemProps {
  item: CartItemType;
  onRemove: (cartItemId: number) => Promise<void>;
  index?: number;
  reservationCountdown?: {
    reservationId: number;
    remainingMs: number;
  };
}

function formatCountdown(totalMs: number): string {
  const safeMs = Math.max(0, totalMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * CartItem - Componente para mostrar un item individual del carrito
 * Muestra la cantidad y permite eliminar
 */
export const CartItem: React.FC<CartItemProps> = ({
  item,
  onRemove,
  index = 0,
  reservationCountdown,
}) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove(item.cartItemId);
    } finally {
      setIsRemoving(false);
    }
  };

  if (isRemoving) {
    return (
      <div className="flex items-center justify-center rounded-3xl border border-border bg-bg-secondary px-5 py-8 shadow-sm">
        <Spinner size="sm" tone="calm" label="Eliminando libro..." />
      </div>
    );
  }

  return (
    <div className="group overflow-hidden rounded-[1.75rem] border border-border bg-bg-secondary shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[96px_minmax(0,1fr)_minmax(220px,auto)] xl:items-start xl:gap-6">
        <div className="relative mx-auto w-full max-w-30 md:max-w-none">
          <div className="aspect-3/4 overflow-hidden rounded-2xl border border-border bg-bg shadow-inner">
            <div className="flex h-full w-full flex-col items-center justify-between p-3 text-center">
              <div className="self-end rounded-full bg-bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-babyblue-700 shadow-sm">
                #{index + 1}
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-secondary text-lg font-black text-text shadow-sm">
                {item.title.slice(0, 1).toUpperCase()}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                  Portada
                </p>
                <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-text">
                  {item.title}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="space-y-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-babyblue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-babyblue-700">
                  Libro seleccionado
                </span>
                <span className="rounded-full bg-bg px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Seleccionado
                </span>
                {reservationCountdown && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Reserva #{reservationCountdown.reservationId} · {formatCountdown(reservationCountdown.remainingMs)}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold tracking-tight text-text sm:text-xl">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-text-muted">{item.author}</p>
              </div>
            </div>

            <div className="w-full max-w-xl rounded-2xl border border-border bg-bg px-4 py-3 text-left xl:max-w-none xl:self-start xl:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Precio unitario
              </p>
              <p className="mt-1 text-xl font-black text-metallicgold-700 sm:text-2xl">
                ${item.unitPrice.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Subtotal:{' '}
                <span className="font-semibold text-text">
                  ${item.subtotal.toFixed(2)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:min-w-65 xl:items-end">
          <div className="w-full rounded-2xl border border-border bg-bg-secondary px-4 py-3 text-left xl:self-start xl:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
              Cantidad
            </p>
            <p className="mt-1 text-2xl font-black text-text">{item.quantity}</p>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            {!isConfirmingRemove ? (
              <button
                onClick={() => setIsConfirmingRemove(true)}
                className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Eliminar
              </button>
            ) : (
              <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 sm:w-auto sm:rounded-full">
                <span className="text-sm font-semibold text-red-800">
                  ¿Eliminar este libro?
                </span>
                <button
                  onClick={() => setIsConfirmingRemove(false)}
                  className="rounded-full px-3 py-1 text-sm font-semibold text-text transition hover:bg-bg-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRemove}
                  className="rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Sí, eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
