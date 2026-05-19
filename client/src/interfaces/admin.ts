export interface Book {
  bookId: string;
  title: string;
  author: string;
  publicationYear?: number | null;
  publisher?: string | null;
  isbn?: string | null;
  language?: string | null;
  pageCount?: number | null;
  price: number;
  condition?: 'new' | 'used' | null;
  isAvailable?: boolean | null;
  description?: string | null;
  coverUrl?: string | null;
  previewUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Store {
  storeId: string;
  name: string;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface Admin {
  adminId: string;
  userId: number;
  username: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  }

export interface AdminStats {
  totalBooks?: number;
  totalStores?: number;
  totalOrders?: number;
  totalAdmins?: number;
  recentStores?: Store[];
}

export interface Category {
  categoryId: string;
  name: string;
  description?: string;
}

export interface CreateBookRequest {
  title: string;
  author: string;
  publicationYear?: number;
  publisher?: string;
  isbn?: string;
  language?: string;
  pageCount?: number;
  price: number;
  condition?: 'new' | 'used';
  isAvailable?: boolean;
  description?: string;
  coverUrl?: string;
  categoryIds: number[];
  initialInventoryQuantity?: number;
}

export interface UpdateBookRequest extends Partial<CreateBookRequest> {
  bookId?: string;
}

export interface CreateStoreRequest {
  name: string;
  address: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  status?: 'active' | 'inactive';
}

export interface UpdateStoreRequest extends Partial<CreateStoreRequest> {
  storeId?: string;
}

export interface StoreInventoryItem {
  bookId: number;
  title: string;
  author: string;
  availableQuantity: number;
  reservedQuantity: number;
  totalQuantity: number;
}

export interface StoreInventoryResponse {
  store: Store;
  items: StoreInventoryItem[];
  totalAvailableQuantity: number;
  totalReservedQuantity: number;
}

export interface StoreOrderClient {
  clientId: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface StoreOrderItem {
  bookId: number;
  title: string;
  quantity: number;
  unitPrice: number;
}

export interface StoreOrderResponse {
  purchaseId: number;
  purchaseDate: string;
  status: 'pending' | 'inPreparation' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  deliveryMode: 'storePickup' | 'homeDelivery' | null;
  pickupStoreId: number | null;
  dispatchDate: string | null;
  client: StoreOrderClient;
  items: StoreOrderItem[];
}

export interface StoreOrdersResponse {
  store: Store;
  orders: StoreOrderResponse[];
  totalOrders: number;
  pendingOrders: number;
}
