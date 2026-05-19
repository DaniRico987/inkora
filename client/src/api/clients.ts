import axios from 'axios';
import { getAccessToken } from '../auth/session';

const api = axios.create({
  baseURL: '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    if (!config.headers) {
      config.headers = {} as never;
    }
    (config.headers as { Authorization?: string }).Authorization = `Bearer ${token}`;
  }
  return config;
});

export type ClientCardType = 'credit' | 'debit';

export interface ClientCard {
  cardId: number;
  maskedNumber: string;
  cardType: ClientCardType;
  expirationDate: string;
  cardHolder: string;
}

export interface ActiveBirthdayVoucher {
  code: string;
  discountPercentage: number;
  expiresAt: string;
  generatedAt: string;
}

export interface ClientSubscription {
  subscriptionId: number;
  categoryId: number;
  categoryName: string;
  subscribedAt: string;
}

export interface ClientProfile {
  clientId: number;
  userId: number;
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  birthDate: string;
  birthPlace: string | null;
  address: string | null;
  gender: string | null;
  subscriptions: ClientSubscription[];
  cards: ClientCard[];
  activeBirthdayVoucher: ActiveBirthdayVoucher | null;
}

export type UpdateClientProfilePayload = {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthPlace?: string;
  address?: string;
  gender?: string;
  email?: string;
  username?: string;
};

export type CreateClientCardPayload = {
  maskedNumber: string;
  cardType: ClientCardType;
  expirationDate: string;
  cardHolder: string;
};

export async function getClientProfile(): Promise<ClientProfile> {
  const { data } = await api.get<ClientProfile>('/clients/me');
  return data;
}

export async function updateClientProfile(payload: UpdateClientProfilePayload): Promise<ClientProfile> {
  const { data } = await api.patch<ClientProfile>('/clients/me', payload);
  return data;
}

export async function createClientCard(payload: CreateClientCardPayload): Promise<ClientProfile> {
  const { data } = await api.post<ClientProfile>('/clients/me/cards', payload);
  return data;
}

export async function deleteClientCard(cardId: number): Promise<void> {
  await api.delete(`/clients/me/cards/${cardId}`);
}
