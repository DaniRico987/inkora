export interface Wallet {
  balance: number;
}

export interface WalletTransaction {
  transactionId: number;
  transactionType: 'payment' | 'refund' | 'topUp';
  amount: number;
  balanceAfter: number;
  transactionDate: string;
  purchaseId?: number | null;
  refundId?: number | null;
  gatewayReference?: string | null;
}
  