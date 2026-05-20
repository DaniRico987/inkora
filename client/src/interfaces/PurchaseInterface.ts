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

export type RefundStatus = 'pending' | 'processed' | 'rejected';

export interface PurchaseRefund {
  refundId: number;
  returnId: number;
  purchaseId: number;
  amount: number;
  refundMethod: string | null;
  requestDate: string;
  status: RefundStatus;
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
  returnBook?: {
    returnBookId: number;
    purchaseId: number;
    clientId: number;
    reason: 'badCondition' | 'didNotMeetExpectations' | 'lateDelivery' | null;
    additionalDescription: string | null;
    requestDate: string;
    status: 'pending' | 'approved' | 'rejected';
    qrCodeUrl: string | null;
    approvalDate: string | null;
    adminNote?: string | null;
    decisionDate?: string | null;
    refund?: PurchaseRefund | null;
  } | null;
  refund?: PurchaseRefund | null;
}

export interface PurchaseStatusMeta {
  label: string;
  tone: BadgeTone;
}
