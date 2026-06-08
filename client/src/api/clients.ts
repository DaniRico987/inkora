import { createApiClient } from './createApiClient';

const api = createApiClient();

export type ClientCardType = 'credit' | 'debit';

export interface ClientCard {
  cardId: number;
  maskedNumber: string;
  cardType: ClientCardType;
  expirationDate: string;
  cardHolder: string;
  /* Debit card: current balance available */
  balance?: number;
  /* Credit card: max credit limit */
  creditLimit?: number;
  /* Credit card: current balance used (total debt) */
  creditUsed?: number;
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
  postalCode: string | null;
  addressComplement: string | null;
  addressLocation: string | null;
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
  postalCode?: string;
  addressComplement?: string;
  addressLocation?: string;
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

export type UpdateCardBalancePayload = {
  amount: number; /* Amount to add to balance (debit cards only) */
};

export type UpdateCardCreditLimitPayload = {
  creditLimit: number; /* New credit limit (credit cards only) */
};

export interface CardPaymentVerification {
  isAuthorized: boolean;
  availableAmount: number;
  message?: string;
}

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

export async function updateCardBalance(
  cardId: number,
  payload: UpdateCardBalancePayload,
): Promise<ClientCard> {
  const { data } = await api.patch<ClientCard>(`/clients/me/cards/${cardId}/balance`, payload);
  return data;
}

export async function updateCardCreditLimit(
  cardId: number,
  payload: UpdateCardCreditLimitPayload,
): Promise<ClientCard> {
  const { data } = await api.patch<ClientCard>(`/clients/me/cards/${cardId}/credit-limit`, payload);
  return data;
}

export async function verifyCardPayment(
  cardId: number,
  amount: number,
): Promise<CardPaymentVerification> {
  const { data } = await api.post<CardPaymentVerification>(
    `/clients/me/cards/${cardId}/verify-payment`,
    { amount },
  );
  return data;
}

export async function processCardPayment(
  cardId: number,
  amount: number,
): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post<{ success: boolean; message: string }>(
    `/clients/me/cards/${cardId}/process-payment`,
    { amount },
  );
  return data;
}
