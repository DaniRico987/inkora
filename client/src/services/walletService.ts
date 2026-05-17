import type { Wallet, WalletTransaction } from '../interfaces/wallet';

const API_URL = import.meta.env.VITE_API_URL;

export const getWallet = async (): Promise<Wallet> => {
  const response = await fetch(`${API_URL}/wallet`);
  if (!response.ok) {
    throw new Error('Error fetching wallet data');
  }
  return response.json();
};

export const getWalletTransactions = async (): Promise<WalletTransaction[]> => {
  const response = await fetch(`${API_URL}/wallet/transactions`);
  if (!response.ok) {
    throw new Error('Error fetching wallet transactions');
  }
  return response.json();
};

export const addCard = async (cardData: any): Promise<any> => {
  const response = await fetch(`${API_URL}/wallet/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cardData),
  });
  if (!response.ok) {
    throw new Error('Error adding card');
  }
  return response.json();
};

export const deleteCard = async (cardId: string): Promise<any> => {
  const response = await fetch(`${API_URL}/wallet/cards/${cardId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Error deleting card');
  }
  return response.json();
};
