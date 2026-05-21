import { useState, useEffect, useCallback } from 'react';
import { getWallet, getWalletTransactions } from '../services/walletService';
import type { Wallet, WalletTransaction } from '../interfaces/wallet';

export const useWallet = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      const [walletData, transactionsData] = await Promise.all([
        getWallet(),
        getWalletTransactions(),
      ]);
      setWallet(walletData);
      setTransactions(transactionsData);
      setError(null);
    } catch {
      setError('Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  return { wallet, transactions, loading, error, refetch: fetchWalletData };
};
