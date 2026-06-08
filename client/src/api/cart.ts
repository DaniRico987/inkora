import { createApiClient } from './createApiClient';

// ======================== INTERFACES ========================

export interface CartItemResponse {
  cartItemId: number;
  bookId: number;
  title: string;
  author: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetCartResponse {
  cartId: number;
  items: CartItemResponse[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCartItemRequest {
  bookId: number;
  quantity?: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

// ======================== API CLIENT ========================

const apiClient = createApiClient();

// ======================== FUNCTIONS ========================

/**
 * Obtiene el carrito activo del cliente con todos los items
 */
export async function getCart(): Promise<GetCartResponse> {
  try {
    const response = await apiClient.get<GetCartResponse>('/cart');
    return response.data;
  } catch (error) {
    console.error('Error fetching cart:', error);
    throw error;
  }
}

/**
 * Agrega un libro al carrito
 */
export async function addToCart(
  bookId: number,
  quantity: number = 1,
): Promise<CartItemResponse> {
  try {
    const response = await apiClient.post<CartItemResponse>('/cart/items', {
      bookId,
      quantity,
    });
    return response.data;
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
}

/**
 * Actualiza la cantidad de un item en el carrito
 */
export async function updateCartItem(
  cartItemId: number,
  quantity: number,
): Promise<CartItemResponse> {
  try {
    const response = await apiClient.patch<CartItemResponse>(
      `/cart/items/${cartItemId}`,
      {
        quantity,
      },
    );
    return response.data;
  } catch (error) {
    console.error('Error updating cart item:', error);
    throw error;
  }
}

/**
 * Elimina un item del carrito
 */
export async function removeCartItem(cartItemId: number): Promise<void> {
  try {
    await apiClient.delete(`/cart/items/${cartItemId}`);
  } catch (error) {
    console.error('Error removing cart item:', error);
    throw error;
  }
}

/**
 * Limpia todo el carrito (elimina todos los items)
 */
export async function clearCart(cartItems: CartItemResponse[]): Promise<void> {
  try {
    await Promise.all(
      cartItems.map((item) => removeCartItem(item.cartItemId)),
    );
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
}
