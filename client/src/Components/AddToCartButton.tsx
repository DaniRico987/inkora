import React, { useState } from 'react';
import { useCart } from '../hooks/useCart';
import { Spinner } from './Spinner';

interface AddToCartButtonProps {
  bookId: number;
  quantity?: number;
  className?: string;
  onSuccess?: () => void;
}

/**
 * AddToCartButton - Botón para agregar un libro al carrito
 * Se puede usar en el catálogo y en páginas de detalles
 */
export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  bookId,
  quantity = 1,
  className = '',
  onSuccess,
}) => {
  const { addItem, error, resetError } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAddToCart = async () => {
    try {
      setIsLoading(true);
      resetError();
      await addItem(bookId, quantity);
      setSuccess(true);

      // Mostrar mensaje de éxito por 2 segundos
      setTimeout(() => {
        setSuccess(false);
      }, 2000);

      onSuccess?.();
    } catch (err) {
      console.error('Error adding to cart:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonClass = className || 'rounded-lg bg-babyblue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-babyblue-700 active:bg-babyblue-800 disabled:opacity-50';

  if (success) {
    return (
      <button
        disabled
        className={`${buttonClass} flex items-center justify-center gap-2`}
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Agregado al carrito
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleAddToCart}
        disabled={isLoading}
        className={`${buttonClass} flex items-center justify-center gap-2`}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" />
            Agregando...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Agregar al Carrito
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
