import React from 'react';
import { useCart } from '../hooks/useCart';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { Spinner } from './Spinner';

/**
 * CartView - Página principal del carrito
 * Muestra todos los items, permite editar cantidades y eliminar
 */
export const CartView: React.FC = () => {
  const { cart, loading, error, updateItem, removeItem, resetError } =
    useCart();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-red-300 bg-red-50 p-6">
          <h2 className="mb-2 text-lg font-bold text-red-900">
            Error al cargar el carrito
          </h2>
          <p className="mb-4 text-red-700">{error}</p>
          <button
            onClick={resetError}
            className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
          <svg
            className="mb-4 h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>

          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Carrito vacío
          </h2>
          <p className="mb-6 text-gray-600">
            No tienes libros en tu carrito. ¡Comienza a explorar nuestro
            catálogo!
          </p>

          <a
            href="/catalog"
            className="rounded-lg bg-babyblue-600 px-6 py-3 font-bold text-white transition-colors hover:bg-babyblue-700"
          >
            Ver Catálogo
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mi Carrito</h1>
        <p className="mt-1 text-gray-600">
          {cart.itemCount} artículo{cart.itemCount !== 1 ? 's' : ''} en tu
          carrito
        </p>
      </div>

      {/* Error global */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={resetError}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items list */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            {/* Header de tabla */}
            <div className="hidden border-b border-gray-200 bg-gray-50 px-4 py-3 md:flex">
              <div className="flex-1 text-xs font-semibold uppercase text-gray-700">
                Producto
              </div>
              <div className="w-24 text-center text-xs font-semibold uppercase text-gray-700">
                Cantidad
              </div>
              <div className="w-24 text-right text-xs font-semibold uppercase text-gray-700">
                Subtotal
              </div>
              <div className="w-12"></div>
            </div>

            {/* Items */}
            {cart.items.map((item) => (
              <CartItem
                key={item.cartItemId}
                item={item}
                onUpdate={updateItem}
                onRemove={removeItem}
              />
            ))}
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="lg:col-span-1">
          <CartSummary cart={cart} />
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="font-semibold text-gray-900">Envío Gratis</h3>
          <p className="mt-1 text-sm text-gray-600">
            En compras mayores a $500
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="font-semibold text-gray-900">Devolución Fácil</h3>
          <p className="mt-1 text-sm text-gray-600">
            Hasta 30 días después de comprar
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="font-semibold text-gray-900">Pago Seguro</h3>
          <p className="mt-1 text-sm text-gray-600">
            Transacciones encriptadas 100%
          </p>
        </div>
      </div>
    </div>
  );
};
