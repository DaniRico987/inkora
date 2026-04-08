import React, { useState } from 'react';
import { Spinner } from './Spinner';
import type { CartItem as CartItemType } from '../interfaces/CartInterface';

interface CartItemProps {
  item: CartItemType;
  onUpdate: (cartItemId: number, quantity: number) => Promise<void>;
  onRemove: (cartItemId: number) => Promise<void>;
}

/**
 * CartItem - Componente para mostrar un item individual del carrito
 * Permite actualizar cantidad y eliminar
 */
export const CartItem: React.FC<CartItemProps> = ({
  item,
  onUpdate,
  onRemove,
}) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) {
      return;
    }

    setQuantity(newQuantity);
    setIsUpdating(true);

    try {
      await onUpdate(item.cartItemId, newQuantity);
    } catch {
      // Revertir si hay error
      setQuantity(item.quantity);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este libro?')) {
      setIsRemoving(true);
      try {
        await onRemove(item.cartItemId);
      } finally {
        setIsRemoving(false);
      }
    }
  };

  if (isRemoving) {
    return (
      <div className="flex items-center justify-center border-b border-gray-200 p-4">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200 p-4 transition-opacity duration-200 hover:bg-gray-50">
      <div className="flex gap-4">
        {/* Portada del libro */}
        <div className="shrink-0">
          <div className="h-24 w-16 overflow-hidden rounded-lg bg-gray-200">
            {/* TODO: Agregar imagen si está disponible */}
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
              Portada
            </div>
          </div>
        </div>

        {/* Detalles del libro */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{item.title}</h3>
          <p className="text-sm text-gray-600">{item.author}</p>

          {/* Precio e información */}
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-metallicgold-600">
                ${item.unitPrice.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                Subtotal: ${item.subtotal.toFixed(2)}
              </p>
            </div>

            {/* Controles de cantidad */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={isUpdating || quantity <= 1}
                className="rounded bg-gray-200 px-2 py-1 text-sm font-semibold text-gray-700 transition-colors enabled:hover:bg-gray-300 disabled:opacity-50"
              >
                −
              </button>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => handleQuantityChange(Number(e.target.value))}
                disabled={isUpdating}
                className="h-8 w-12 rounded border border-gray-300 px-2 text-center text-sm disabled:bg-gray-50"
              />

              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={isUpdating}
                className="rounded bg-gray-200 px-2 py-1 text-sm font-semibold text-gray-700 transition-colors enabled:hover:bg-gray-300 disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Botón de eliminar */}
        <div className="shrink-0">
          <button
            onClick={handleRemove}
            disabled={isUpdating}
            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            title="Eliminar del carrito"
          >
            <svg
              className="h-5 w-5"
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
          </button>
        </div>
      </div>
    </div>
  );
};
