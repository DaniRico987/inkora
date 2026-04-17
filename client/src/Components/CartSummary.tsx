import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { GetCartResponse } from '../api/cart';

interface CartSummaryProps {
  cart: GetCartResponse;
}

/**
 * CartSummary - Muestra el resumen del carrito con totales
 */
export const CartSummary: React.FC<CartSummaryProps> = ({ cart }) => {
  const navigate = useNavigate();

  const itemsWithTax = cart.items.map((item) => ({
    ...item,
    tax: item.subtotal * 0.21,
  }));

  const handleCheckout = () => {
    // TODO: Implementar checkout
    navigate('/checkout');
  };

  return (
    <aside className="overflow-hidden rounded-3xl border border-border bg-bg-secondary shadow-sm lg:sticky lg:top-6">
      <div className="border-b border-border bg-bg px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-babyblue-700">
          Checkout summary
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
              Resumen
            </h2>
            <p className="max-w-104 text-sm leading-6 text-text-muted">
              {cart.itemCount} artículo{cart.itemCount !== 1 ? 's' : ''} listo
              {cart.itemCount !== 1 ? 's' : ''} para continuar.
            </p>
          </div>
          <div className="w-full shrink-0 rounded-2xl border border-border bg-bg-secondary px-4 py-3 text-left sm:w-44 sm:text-right">
            <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">
              Total
            </p>
            <p className="text-2xl font-bold text-text">${cart.total.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-3 rounded-3xl bg-bg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Subtotal</span>
            <span className="font-semibold text-text">
              ${cart.subtotal.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Impuestos (21%)</span>
            <span className="font-semibold text-text">
              ${cart.tax.toFixed(2)}
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-muted">
              Total final
            </span>
            <span className="text-2xl font-black text-metallicgold-700">
              ${cart.total.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-bg p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-babyblue-700">
            Detalle de ítems
          </p>
          <div className="mt-3 space-y-3">
            {itemsWithTax.map((item) => (
              <div
                key={item.cartItemId}
                className="flex flex-col gap-2 rounded-2xl bg-bg-secondary px-3 py-3 shadow-sm sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">
                    {item.title}
                  </p>
                  <p className="text-xs text-text-muted">
                    {item.quantity} x ${item.unitPrice.toFixed(2)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm font-bold text-text">
                    ${item.subtotal.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    IVA ${item.tax.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleCheckout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-babyblue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-babyblue-700"
          >
            Proceder al pago
            <span aria-hidden="true">→</span>
          </button>

          <button
            onClick={() => navigate('/catalog')}
            className="inline-flex w-full items-center justify-center rounded-full border border-border bg-bg-secondary px-5 py-3 font-semibold text-text transition hover:border-babyblue-300 hover:text-babyblue-700"
          >
            Seguir comprando
          </button>
        </div>

        <div className="rounded-3xl border border-border bg-bg-secondary px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-metallicgold-50 p-2 text-metallicgold-700">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 9v3.75m9.301 3.502A1.35 1.35 0 0120.04 18H3.96a1.35 1.35 0 01-1.26-1.748l8.04-15.117a1.35 1.35 0 012.48 0l8.04 15.117zM12 16.5h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-text">
                Compra segura
              </p>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                Tus cambios se aplican en tiempo real y el acceso al checkout
                queda listo cuando termines de ajustar tu carrito.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
