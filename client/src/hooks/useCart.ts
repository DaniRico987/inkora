import { useState, useEffect, useCallback } from 'react';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  type GetCartResponse,
  type CartItemResponse,
} from '../api/cart';

export interface UseCartState {
  cart: GetCartResponse | null;
  loading: boolean;
  error: string | null;
}

export interface UseCartActions {
  loadCart: () => Promise<void>;
  addItem: (bookId: number, quantity?: number) => Promise<void>;
  updateItem: (cartItemId: number, quantity: number) => Promise<void>;
  removeItem: (cartItemId: number) => Promise<void>;
  clearItems: () => Promise<void>;
  resetError: () => void;
}

export type UseCartReturn = UseCartState & UseCartActions;

/**
 * Hook principal para manejar el estado del carrito
 * Carga automáticamente el carrito al montar
 */
export function useCart(): UseCartReturn {
  const [cart, setCart] = useState<GetCartResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ======================== LOAD CART ========================

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCart();
      setCart(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar el carrito';
      setError(message);
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ======================== ADD ITEM ========================

  const addItem = useCallback(
    async (bookId: number, quantity: number = 1) => {
      try {
        setError(null);
        await addToCart(bookId, quantity);
        await loadCart(); // Refrescar carrito completo
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error al agregar al carrito';
        setError(message);
        console.error('Error adding item:', err);
      }
    },
    [loadCart],
  );

  // ======================== UPDATE ITEM ========================

  const updateItem = useCallback(
    async (cartItemId: number, quantity: number) => {
      if (quantity < 1) {
        await removeItem(cartItemId);
        return;
      }

      try {
        setError(null);
        await updateCartItem(cartItemId, quantity);
        await loadCart(); // Refrescar carrito completo
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Error al actualizar cantidad';
        setError(message);
        console.error('Error updating item:', err);
      }
    },
    [loadCart],
  );

  // ======================== REMOVE ITEM ========================

  const removeItem = useCallback(
    async (cartItemId: number) => {
      try {
        setError(null);
        await removeCartItem(cartItemId);
        // Actualizar estado local sin refrescar
        setCart((prevCart) => {
          if (!prevCart) return null;
          const updatedItems = prevCart.items.filter(
            (item) => item.cartItemId !== cartItemId,
          );
          const { subtotal, tax, total } = calculateTotals(updatedItems);
          return {
            ...prevCart,
            items: updatedItems,
            subtotal,
            tax,
            total,
            itemCount: updatedItems.length,
          };
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error al eliminar item';
        setError(message);
        console.error('Error removing item:', err);
      }
    },
    [],
  );

  // ======================== CLEAR ITEMS ========================

  const clearItems = useCallback(async () => {
    try {
      setError(null);
      if (cart) {
        await clearCart(cart.items);
        setCart({
          ...cart,
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          itemCount: 0,
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al limpiar carrito';
      setError(message);
      console.error('Error clearing cart:', err);
    }
  }, [cart]);

  // ======================== RESET ERROR ========================

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // ======================== INITIAL LOAD ========================

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  return {
    // State
    cart,
    loading,
    error,
    // Actions
    loadCart,
    addItem,
    updateItem,
    removeItem,
    clearItems,
    resetError,
  };
}

// ======================== HELPER FUNCTIONS ========================

/**
 * Calcula totales (usado para actualizaciones optimistas)
 */
function calculateTotals(
  items: CartItemResponse[],
): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.21;
  const total = subtotal + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
