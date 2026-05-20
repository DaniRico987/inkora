import axios from 'axios';
import { getAccessToken } from '../auth/session';
import type { Purchase } from '../interfaces/PurchaseInterface';

export type CreatePurchasePayload = {
  deliveryMode: 'homeDelivery' | 'storePickup';
  pickupStoreId?: number;
  paymentMethod?: string;
  currency?: string;
  registeredCardId?: number;
  newCard?: {
    cardholder: string;
    cardNumber: string;
    expiry: string;
    cvv: string;
  };
  shippingAddress?: string;
  voucherCode?: string;
};

export type VoucherValidationResult = {
  code: string;
  discountPercentage: number;
  expiresAt: string;
  generatedAt: string;
};

export type ReturnReason =
  | 'badCondition'
  | 'didNotMeetExpectations'
  | 'lateDelivery';

export type CreateReturnRequestPayload = {
  purchaseId: number;
  reason: ReturnReason;
  additionalDescription?: string;
};

export type ReturnRequest = {
  returnBookId: number;
  purchaseId: number;
  clientId: number;
  reason: ReturnReason | null;
  additionalDescription: string | null;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  qrCodeUrl: string | null;
  approvalDate: string | null;
};

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
    const payload = error.response?.data as { message?: string | string[]; code?: string } | undefined;
    const message = payload?.message;
    const err = new Error(
      Array.isArray(message)
        ? message.join(', ')
        : typeof message === 'string' && message.trim().length > 0
        ? message
        : fallback,
    );

    // Attach additional info from the response for higher-level callers
    try {
      (err as any).status = error.response?.status;
      (err as any).data = error.response?.data;
      if (payload?.code) (err as any).code = payload.code;
    } catch {
      // ignore
    }

    return err;
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

export async function createPurchase(
  payload: CreatePurchasePayload,
): Promise<Purchase> {
  try {
    const response = await apiClient.post<Purchase>('/purchases', payload);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo confirmar la compra');
  }
}

export async function validateVoucherCode(
  code: string,
): Promise<VoucherValidationResult> {
  try {
    const response = await apiClient.get<VoucherValidationResult>(`/vouchers/validate/${encodeURIComponent(code)}`);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo validar el voucher');
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

export async function createReturnRequest(
  payload: CreateReturnRequestPayload,
): Promise<ReturnRequest> {
  try {
    const response = await apiClient.post<ReturnRequest>('/returns', payload);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo enviar la solicitud de devolucion');
  }
}
