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

  const handleCheckout = () => {
    // TODO: Implementar checkout
    navigate('/checkout');
  };

  return (
    <div className="sticky top-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Resumen</h2>

      {/* Items */}
      <div className="mb-4 space-y-2 border-b border-gray-200 pb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{cart.itemCount} artículo(s)</span>
          <span className="font-semibold text-gray-900">
            ${cart.subtotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Desglose de cálculos */}
      <div className="mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900">${cart.subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Impuestos (21%)</span>
          <span className="text-gray-900">${cart.tax.toFixed(2)}</span>
        </div>
      </div>

      {/* Total */}
      <div className="mb-6 border-t-2 border-gray-200 pt-4">
        <div className="flex justify-between">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-metallicgold-600">
            ${cart.total.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Botón Checkout */}
      <button
        onClick={handleCheckout}
        className="w-full rounded-lg bg-babyblue-600 px-4 py-3 font-bold text-white transition-colors hover:bg-babyblue-700 active:bg-babyblue-800"
      >
        Proceder al Pago
      </button>

      {/* Botón continuar comprando */}
      <button
        onClick={() => navigate('/catalog')}
        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        Seguir Comprando
      </button>
    </div>
  );
};
