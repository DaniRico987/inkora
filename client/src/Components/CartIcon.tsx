import React from 'react';
import { useCart } from '../hooks/useCart';

/**
 * CartIcon - Badge del carrito con contador de items
 * Se muestra en la navbar con el número de items totales
 */
export const CartIcon: React.FC = () => {
  const { cart } = useCart();

  const itemCount = cart?.itemCount ?? 0;

  return (
    <div className="relative inline-block">
      {/* Icono del carrito */}
      <svg
        className="h-6 w-6 text-babyblue-50/95 transition-colors duration-200 hover:text-metallicgold-100"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>

      {/* Badge con contador */}
      {itemCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </div>
  );
};
