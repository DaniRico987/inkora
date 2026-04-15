import { useCallback, useEffect, useState } from 'react';
import { getPurchaseById } from '../api/purchases';
import type { Purchase } from '../interfaces/PurchaseInterface';

export interface UsePurchaseTrackingState {
  purchase: Purchase | null;
  loading: boolean;
  error: string | null;
}

export interface UsePurchaseTrackingActions {
  refresh: () => Promise<void>;
  clearError: () => void;
}

export type UsePurchaseTrackingReturn =
  UsePurchaseTrackingState & UsePurchaseTrackingActions;

export function usePurchaseTracking(purchaseId?: number): UsePurchaseTrackingReturn {
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!purchaseId || Number.isNaN(purchaseId) || purchaseId <= 0) {
      setPurchase(null);
      setLoading(false);
      setError('El identificador del pedido no es valido.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getPurchaseById(purchaseId);
      setPurchase(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo cargar el pedido';
      setError(message);
      setPurchase(null);
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    purchase,
    loading,
    error,
    refresh,
    clearError,
  };
}
