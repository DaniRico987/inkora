import axios from 'axios';
import { getAccessToken } from '../auth/session';

export interface CreateReservationRequest {
  items: Array<{
    bookId: number;
    quantity: number;
  }>;
}

export interface ReservationItemResponse {
  reservationItemId: number;
  bookId: number;
  title: string;
  quantity: number;
}

export interface ReservationResponse {
  reservationId: number;
  clientId: number;
  status: 'active' | 'cancelled' | 'expired' | 'converted';
  reservationDate: string;
  expirationDate: string;
  items: ReservationItemResponse[];
}

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
    console.error('Reservation API error:', {
      status: error.response?.status,
      data: error.response?.data,
    });

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

export async function createReservation(
  payload: CreateReservationRequest,
): Promise<ReservationResponse> {
  try {
    const response = await apiClient.post<ReservationResponse>('/reservations', payload);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo crear la reserva');
  }
}

export async function getReservations(): Promise<ReservationResponse[]> {
  try {
    const response = await apiClient.get<ReservationResponse[]>('/reservations');
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo cargar el historial de reservas');
  }
}

export async function cancelReservation(
  reservationId: number,
): Promise<ReservationResponse> {
  try {
    const response = await apiClient.patch<ReservationResponse>(
      `/reservations/${reservationId}/cancel`,
    );
    return response.data;
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo cancelar la reserva');
  }
}
