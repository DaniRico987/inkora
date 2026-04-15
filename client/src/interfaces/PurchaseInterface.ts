import type { BadgeTone } from './StatusBadgeInterface';

export type PurchaseStatus =
  | 'inPreparation'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type DeliveryMode = 'homeDelivery' | 'storePickup';

export interface PurchaseItem {
  purchaseItemId: number;
  bookId: number;
  title: string;
  author: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Purchase {
  purchaseId: number;
  clientId: number;
  purchaseDate: string;
  totalAmount: number;
  paymentMethod?: string | null;
  shippingAddress?: string | null;
  deliveryMode?: DeliveryMode | null;
  pickupStoreId?: number | null;
  estimatedDeliveryTime?: string | null;
  dispatchDate?: string | null;
  status: PurchaseStatus;
  items: PurchaseItem[];
}

export interface PurchaseStatusMeta {
  label: string;
  tone: BadgeTone;
}
