import axios from 'axios';
import { getAccessToken } from '../auth/session';
import type { Purchase } from '../interfaces/PurchaseInterface';

const apiClient = axios.create({
  baseURL: '/api/v1',
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function normalizeApiError(error: unknown, fallback: string): Error {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { message?: string | string[] } | undefined;
    const message = payload?.message;
    if (Array.isArray(message)) {
      return new Error(message.join(', '));
    }
    if (typeof message === 'string' && message.trim().length > 0) {
      return new Error(message);
    }
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallback);
}

export async function getPurchaseById(purchaseId: number): Promise<Purchase> {
  try {
    const response = await apiClient.get<Purchase>(`/purchases/${purchaseId}`);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo cargar el pedido');
  }
}

export async function updatePurchaseAddress(
  purchaseId: number,
  shippingAddress: string,
): Promise<Purchase> {
  try {
    const response = await apiClient.patch<Purchase>(`/purchases/${purchaseId}/address`, {
      shippingAddress,
    });
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo actualizar la direccion del pedido');
  }
}
