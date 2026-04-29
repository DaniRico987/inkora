import axios from 'axios';
import type { CreateStoreRequest, UpdateStoreRequest } from '../interfaces/admin';
import { getAccessToken } from '../auth/session';

/** Cliente sin JWT: rutas públicas como GET /stores/public */
const publicStoresClient = axios.create({
  baseURL: '/api/v1',
});

const apiClient = axios.create({
  baseURL: '/api/v1',
});

// Add authorization header
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type PublicStore = {
  storeId: number;
  name: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

export async function getPublicStores(): Promise<PublicStore[]> {
  const response = await publicStoresClient.get<PublicStore[]>('/stores/public');
  return response.data;
}

export async function getStores(page: number = 1, limit: number = 10) {
  try {
    const response = await apiClient.get('/stores', {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching stores:', error);
    throw error;
  }
}

export async function getStoreDetail(storeId: string) {
  try {
    const response = await apiClient.get(`/stores/${storeId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching store detail:', error);
    throw error;
  }
}

export async function createStore(data: CreateStoreRequest) {
  try {
    const response = await apiClient.post('/stores', data);
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
  storeId: string,
  data: Partial<UpdateStoreRequest>
) {
  try {
    const response = await apiClient.put(`/stores/${storeId}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating store:', error);
    throw error;
  }
}

export async function deleteStore(storeId: string) {
  try {
    const response = await apiClient.delete(`/stores/${storeId}`);
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
