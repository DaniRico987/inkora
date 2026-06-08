import axios from 'axios';
import { createApiClient } from './createApiClient';

export type CreateRefundPayload = {
  returnBookId: number;
};

export type Refund = {
  refundId: number;
  returnId: number;
  purchaseId: number;
  amount: number;
  refundMethod: string | null;
  requestDate: string;
  status: 'pending' | 'processed' | 'rejected';
};

const apiClient = createApiClient();

function normalizeApiError(error: unknown, fallback: string): Error {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { message?: string | string[] } | undefined;
    const message = payload?.message;

    return new Error(
      Array.isArray(message)
        ? message.join(', ')
        : typeof message === 'string' && message.trim().length > 0
        ? message
        : fallback,
    );
  }

  return error instanceof Error ? error : new Error(fallback);
}

export async function createRefundRequest(
  payload: CreateRefundPayload,
): Promise<Refund> {
  try {
    const response = await apiClient.post<Refund>('/refunds', payload);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo solicitar el reembolso');
  }
}