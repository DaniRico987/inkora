import axios from 'axios';
import { getAccessToken } from '../auth/session';
import type { Wallet, WalletTransaction } from '../interfaces/wallet';

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

type WalletApiResponse = {
  availableBalance: number;
};

type WalletTransactionsApiResponse = {
  items: WalletTransaction[];
};

export type WalletTopUpPayload = {
  amount: number;
  cardId: number;
};

export const getWallet = async (): Promise<Wallet> => {
  const { data } = await api.get<WalletApiResponse>('/wallet');
  return {
    balance: data.availableBalance,
  };
};

export const getWalletTransactions = async (): Promise<WalletTransaction[]> => {
  const { data } = await api.get<WalletTransactionsApiResponse>('/wallet/transactions');
  return data.items;
};

export const topUpWallet = async (payload: WalletTopUpPayload): Promise<Wallet> => {
  const { data } = await api.post<WalletApiResponse>('/wallet/top-up', payload);
  return {
    balance: data.availableBalance,
  };
};
