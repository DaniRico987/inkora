import axios from 'axios';
import { getAccessToken } from '../auth/session';

export type HistoryPurchaseStatus = 'inPreparation' | 'shipped' | 'delivered' | 'cancelled' | string;
export type HistoryReservationStatus = 'active' | 'cancelled' | 'expired' | 'converted' | string;

export interface HistoryPurchaseItem {
  purchaseItemId: number;
  bookId: number;
  title: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  coverUrl?: string | null;
}

export interface HistoryReservationItem {
  reservationItemId: number;
  bookId: number;
  title: string;
  quantity: number;
  coverUrl?: string | null;
}

export interface HistoryPurchase {
  purchaseId: number;
  purchaseDate: string;
  totalAmount: number;
  status: HistoryPurchaseStatus;
  items: HistoryPurchaseItem[];
}

export interface HistoryReservation {
  reservationId: number;
  reservationDate: string;
  expirationDate?: string | null;
  status: HistoryReservationStatus;
  items: HistoryReservationItem[];
}

export interface ClientHistoryResponse {
  purchases: HistoryPurchase[];
  reservations: HistoryReservation[];
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
    const payload = error.response?.data as { message?: string | string[] } | undefined;
    const message = payload?.message;
    if (Array.isArray(message)) return new Error(message.join(', '));
    if (typeof message === 'string' && message.trim().length > 0) return new Error(message);
  }
  if (error instanceof Error) return error;
  return new Error(fallback);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export async function getClientHistory(): Promise<ClientHistoryResponse> {
  try {
    const response = await apiClient.get<unknown>('/clients/me/history');
    const data = response.data ?? {};

    // Server may return either a shaped object { purchases: [...], reservations: [...] }
    // or a flat array of mixed entries (purchase/reservation). Handle both.
    if (Array.isArray(data)) {
      const purchases: HistoryPurchase[] = [];
      const reservations: HistoryReservation[] = [];

      for (const entry of data) {
        const type = asString((entry as any).type, '');
        const transactionDate = (entry as any).transactionDate;

        if (type === 'purchase') {
          const itemsRaw = asArray<Record<string, unknown>>((entry as any).items);
          purchases.push({
            purchaseId: asNumber((entry as any).transactionId),
            purchaseDate: asString(transactionDate ? (transactionDate as any).toString() : ''),
            totalAmount: asNumber((entry as any).totalAmount),
            status: asString((entry as any).status, 'inPreparation'),
            items: itemsRaw.map((item, idx) => ({
              purchaseItemId: asNumber(item.purchaseItemId ?? idx),
              bookId: asNumber(item.bookId),
              title: asString(item.title, 'Libro sin titulo'),
              quantity: asNumber(item.quantity, 1),
              unitPrice: asNumber(item.unitPrice ?? item.unitPrice),
              subtotal: asNumber(item.subtotal ?? (asNumber(item.unitPrice) * asNumber(item.quantity))),
              coverUrl: item.coverUrl ? asString(item.coverUrl) : null,
            })),
          });
        } else if (type === 'reservation') {
          const itemsRaw = asArray<Record<string, unknown>>((entry as any).items);
          reservations.push({
            reservationId: asNumber((entry as any).transactionId),
            reservationDate: asString(transactionDate ? (transactionDate as any).toString() : ''),
            expirationDate: (entry as any).expirationDate ? asString((entry as any).expirationDate) : null,
            status: asString((entry as any).status, 'active'),
            items: itemsRaw.map((item, idx) => ({
              reservationItemId: asNumber(item.reservationItemId ?? idx),
              bookId: asNumber(item.bookId),
              title: asString(item.title, 'Libro sin titulo'),
              quantity: asNumber(item.quantity, 1),
              coverUrl: item.coverUrl ? asString(item.coverUrl) : null,
            })),
          });
        }
      }

      return { purchases, reservations };
    }

    const payload = (data ?? {}) as Record<string, unknown>;

    const purchasesRaw = asArray<Record<string, unknown>>(payload.purchases);
    const reservationsRaw = asArray<Record<string, unknown>>(payload.reservations);

    const purchases: HistoryPurchase[] = purchasesRaw.map((purchase) => {
      const itemsRaw = asArray<Record<string, unknown>>(purchase.items);
      return {
        purchaseId: asNumber(purchase.purchaseId),
        purchaseDate: asString(purchase.purchaseDate),
        totalAmount: asNumber(purchase.totalAmount),
        status: asString(purchase.status, 'inPreparation'),
        items: itemsRaw.map((item) => ({
          purchaseItemId: asNumber(item.purchaseItemId),
          bookId: asNumber(item.bookId),
          title: asString(item.title, 'Libro sin titulo'),
          quantity: asNumber(item.quantity, 1),
          unitPrice: asNumber(item.unitPrice),
          subtotal: asNumber(item.subtotal),
          coverUrl: item.coverUrl ? asString(item.coverUrl) : null,
        })),
      };
    });

    const reservations: HistoryReservation[] = reservationsRaw.map((reservation) => {
      const itemsRaw = asArray<Record<string, unknown>>(reservation.items);
      return {
        reservationId: asNumber(reservation.reservationId),
        reservationDate: asString(reservation.reservationDate),
        expirationDate: reservation.expirationDate ? asString(reservation.expirationDate) : null,
        status: asString(reservation.status, 'active'),
        items: itemsRaw.map((item) => ({
          reservationItemId: asNumber(item.reservationItemId),
          bookId: asNumber(item.bookId),
          title: asString(item.title, 'Libro sin titulo'),
          quantity: asNumber(item.quantity, 1),
          coverUrl: item.coverUrl ? asString(item.coverUrl) : null,
        })),
      };
    });

    return { purchases, reservations };
  } catch (error) {
    throw normalizeApiError(error, 'No se pudo cargar tu historial');
  }
}
