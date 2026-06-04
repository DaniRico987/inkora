import axios from 'axios';
import type { AdminStats } from '../interfaces/admin';
import { getAccessToken } from '../auth/session';
import { getBooks } from './books';
import { getStores } from './stores';

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

export async function getAdmins(page: number = 1, limit: number = 10) {
  try {
    const response = await apiClient.get('/admin', {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching admins:', error);
    throw error;
  }
}

export async function deactivateAdmin(adminId: string) {
  try {
    // Backend usa DELETE en lugar de PATCH deactivate
    const response = await apiClient.delete(`/admin/${adminId}`);
    return response.data;
  } catch (error) {
    console.error('Error deactivating admin:', error);
    throw error;
  }
}

export async function activateAdmin(adminId: string) {
  try {
    // Endpoint para reactivar - verificar si existe en backend
    // Por ahora, usar PATCH si está disponible
    const response = await apiClient.patch(`/admin/${adminId}/activate`);
    return response.data;
  } catch (error) {
    console.error('Error activating admin:', error);
    throw error;
  }
}

export async function getAdminStats(): Promise<AdminStats> {
  let totalBooks = 0;
  let totalStores = 0;
  let totalAdmins = 0;

  // Books count
  try {
    const booksData = await getBooks(1, 1);
    totalBooks = booksData?.total ?? 0;
  } catch (error) {
    console.error('Error fetching books stats:', error);
  }

  // Stores count
  try {
    const storesData = await getStores();
    totalStores = Array.isArray(storesData) ? storesData.length : 0;
  } catch (error) {
    console.error('Error fetching stores stats:', error);
  }

  // Admins count: endpoint /admin solo root, fallback según rol
  try {
    const adminsData = await apiClient.get('/admin');
    if (Array.isArray(adminsData?.data)) {
      totalAdmins = adminsData.data.length;
    }
  } catch (error: unknown) {
    console.error('Error fetching admins stats:', error);
    if (axios.isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 401)) {
      // Si no es root, al menos mostramos 1 admin (actual) y no dejamos 0
      totalAdmins = 1;
    }
  }

  return {
    totalBooks,
    totalStores,
    totalAdmins,
  };
}


export async function getAdminDetail(adminId: string) {
  try {
    const response = await apiClient.get(`/admin/admins/${adminId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching admin detail:', error);
    throw error;
  }
}

export interface CreateAdminRequest {
  firstName: string;
  lastName?: string;
  email: string;
  username?: string;
  dni?: string;
  birthDate?: string;
  birthPlace?: string;
  address?: string;
  gender?: string;
}

export async function createAdmin(data: CreateAdminRequest) {
  try {
    const response = await apiClient.post('/admin', data);
    return response.data;
  } catch (error) {
    console.error('Error creating admin:', error);
    throw error;
  }
}

export type AdminReturnRequestItem = {
  purchaseItemId: number;
  bookId: number;
  title: string;
  author: string;
  quantity: number;
  coverUrl: string | null;
  previewUrl: string | null;
};

export type AdminReturnRequest = {
  returnBookId: number;
  purchaseId: number;
  clientId: number;
  clientName: string;
  clientEmail: string;
  reason: 'badCondition' | 'didNotMeetExpectations' | 'lateDelivery' | null;
  reasonLabel: string;
  additionalDescription: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  approvalDate: string | null;
  qrCodeUrl: string | null;
  purchaseDate: string;
  totalAmount: number;
  items: AdminReturnRequestItem[];
};

export async function getPendingReturns(): Promise<AdminReturnRequest[]> {
  try {
    const response = await apiClient.get<AdminReturnRequest[]>('/returns/pending');
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching pending returns:', error);
    throw error;
  }
}

export async function approveReturn(returnBookId: number): Promise<AdminReturnRequest> {
  try {
    const response = await apiClient.patch<AdminReturnRequest>(`/returns/${returnBookId}/approve`);
    return response.data;
  } catch (error) {
    console.error('Error approving return:', error);
    throw error;
  }
}

export async function rejectReturn(returnBookId: number, adminNote?: string): Promise<AdminReturnRequest> {
  try {
    const response = await apiClient.patch<AdminReturnRequest>(`/returns/${returnBookId}/reject`, {
      adminNote,
    });
    return response.data;
  } catch (error) {
    console.error('Error rejecting return:', error);
    throw error;
  }
}

export type AuditLogUser = {
  userId: number;
  email: string;
  username: string;
  userType: 'client' | 'admin' | 'root';
};

export type AuditLogItem = {
  logId: number;
  userId: number;
  action: string;
  affectedEntity: string | null;
  affectedEntityId: number | null;
  createdAt: string;
  detail: string | null;
  user: AuditLogUser;
};

export type AuditLogsResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: AuditLogItem[];
};

export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  user?: string;
  action?: string;
  entity?: string;
  startDate?: string;
  endDate?: string;
}

export async function getAuditLogs(params: GetAuditLogsParams = {}): Promise<AuditLogsResponse> {
  try {
    const response = await apiClient.get<AuditLogsResponse>('/audit-logs', {
      params,
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
}
