export interface Wallet {
    balance: number;
    cards: PaymentMethod[];
  }
  
  export interface WalletTransaction {
    id: string;
    date: string;
    type: 'purchase' | 'refund';
    amount: number;
    status: 'completed' | 'pending' | 'failed';
  }
  
  export interface PaymentMethod {
    id: string;
    last4: string;
    brand: string;
    isDefault: boolean;
  }
  