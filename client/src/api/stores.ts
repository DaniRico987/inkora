import axios from 'axios';
import type { CreateStoreRequest, UpdateStoreRequest } from '../interfaces/admin';
import { createApiClient } from './createApiClient';

/** Cliente sin JWT: rutas públicas como GET /stores/public */
const publicStoresClient = axios.create({
  baseURL: '/api/v1',
});

const apiClient = createApiClient();

export type PublicStore = {
  storeId: number;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

export type NearestStore = PublicStore & {
  distanceKm: number;
};

export type StoreStatus = 'active' | 'inactive';

export type StoreRecord = {
  storeId: number;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  status: StoreStatus;
};

export type StoreInventoryItem = {
  bookId: number;
  title: string;
  author: string;
  availableQuantity: number;
  reservedQuantity: number;
  totalQuantity: number;
};

export type StoreInventoryResponse = {
  store: StoreRecord;
  items: StoreInventoryItem[];
  totalAvailableQuantity: number;
  totalReservedQuantity: number;
};

export type StoreOrderStatus = 'inPreparation' | 'shipped' | 'delivered' | 'cancelled';

export type StoreOrderClient = {
  clientId: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type StoreOrderItem = {
  purchaseItemId: number;
  bookId: number;
  title: string;
  author: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type StoreOrder = {
  purchaseId: number;
  purchaseDate: string;
  status: StoreOrderStatus;
  totalAmount: number;
  deliveryMode: 'storePickup' | 'homeDelivery' | null;
  pickupStoreId: number | null;
  dispatchDate: string | null;
  client: StoreOrderClient;
  items: StoreOrderItem[];
};

export type StoreOrdersResponse = {
  store: StoreRecord;
  orders: StoreOrder[];
  totalOrders: number;
  pendingOrders: number;
};

export type UpdateStoreInventoryItem = {
  bookId: number;
  availableQuantity: number;
};

export async function getPublicStores(): Promise<PublicStore[]> {
  const response = await publicStoresClient.get<PublicStore[]>('/stores/public');
  return response.data;
}

export async function getNearestStores(
  lat: number,
  lng: number,
): Promise<NearestStore[]> {
  const response = await publicStoresClient.get<NearestStore[]>('/stores/nearest', {
    params: { lat, lng },
  });

  return response.data;
}

export async function getStores(): Promise<StoreRecord[]> {
  try {
    const response = await apiClient.get<StoreRecord[]>('/stores');
    return response.data;
  } catch (error) {
    console.error('Error fetching stores:', error);
    throw error;
  }
}

export async function createStore(data: CreateStoreRequest): Promise<StoreRecord> {
  try {
    const response = await apiClient.post<StoreRecord>('/stores', data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Error response from server:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    } else {
      console.error('Error creating store:', error);
    }
    throw error;
  }
}

export async function updateStore(
  storeId: number,
  data: Partial<UpdateStoreRequest>,
): Promise<StoreRecord> {
  try {
    const response = await apiClient.put<StoreRecord>(`/stores/${storeId}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating store:', error);
    throw error;
  }
}

export async function deleteStore(storeId: number): Promise<{ id: number }> {
  try {
    const response = await apiClient.delete<{ id: number }>(`/stores/${storeId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting store:', error);
    throw error;
  }
}

export type AvailableStore = {
  storeId: number;
  name: string;
  address: string;
  city: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  capacity?: number | null;
  status?: 'active' | 'inactive';
  availableQuantity: number;
};

export async function getAvailableStores(bookId: number): Promise<AvailableStore[]> {
  try {
    const response = await apiClient.get<AvailableStore[]>('/stores/available', {
      params: { bookId },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching available stores:', error);
    throw error;
  }
}

export async function getStoreInventory(storeId: number): Promise<StoreInventoryResponse> {
  try {
    const response = await apiClient.get<StoreInventoryResponse>(`/stores/${storeId}/inventory`);
    return response.data;
  } catch (error) {
    console.error('Error fetching store inventory:', error);
    throw error;
  }
}

export async function getStoreOrders(storeId: number): Promise<StoreOrdersResponse> {
  try {
    const response = await apiClient.get<StoreOrdersResponse>(`/stores/${storeId}/orders`);
    return response.data;
  } catch (error) {
    console.error('Error fetching store orders:', error);
    throw error;
  }
}

export async function updateStoreInventory(
  storeId: number,
  items: UpdateStoreInventoryItem[],
): Promise<StoreInventoryResponse> {
  try {
    const response = await apiClient.patch<StoreInventoryResponse>(`/stores/${storeId}/inventory`, {
      items,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating store inventory:', error);
    throw error;
  }
}
