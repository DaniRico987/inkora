import axios from 'axios';
import type { CreateBookRequest, UpdateBookRequest } from '../interfaces/admin';
import { getAccessToken } from '../auth/session';

export interface GetBooksQueryParams {
  title?: string;
  author?: string;
  categoryId?: number;
  language?: string;
  condition?: 'new' | 'used';
  minPrice?: number;
  maxPrice?: number;
  year?: number;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'publicationYear' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

export interface BookCategoryItem {
  id: number;
  name: string;
  description?: string | null;
}

export interface BookImageItem {
  id: number;
  url: string;
  displayOrder: number;
}

export interface BookListItem {
  id: number;
  coverUrl?: string | null;
  title: string;
  author: string;
  price: number;
  quantity: number;
  status?: string | null;
  isAvailable: boolean;
}

export interface BookDetailItem {
  id: number;
  title: string;
  author: string;
  publicationYear?: number | null;
  publisher?: string | null;
  isbn?: string | null;
  language?: string | null;
  pageCount?: number | null;
  price: number;
  quantity: number;
  status?: string | null;
  isAvailable: boolean;
  description?: string | null;
  coverUrl?: string | null;
  preview?: string | null;
  images: BookImageItem[];
  categories: BookCategoryItem[];
}

export interface PaginatedBooksResponse {
  items: BookListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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

export async function getBooks(
  page: number = 1,
  limit: number = 10,
): Promise<PaginatedBooksResponse> {
  try {
    const response = await apiClient.get<PaginatedBooksResponse>('/books', {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching books:', error);
    throw error;
  }
}

export async function searchBooks(
  query: string | GetBooksQueryParams,
  page: number = 1,
): Promise<PaginatedBooksResponse> {
  try {
    const params =
      typeof query === 'string'
        ? {
          title: query,
          page,
        }
        : query;

    const response = await apiClient.get<PaginatedBooksResponse>('/books/search', {
      params,
    });
    return response.data;
  } catch (error) {
    console.error('Error searching books:', error);
    throw error;
  }
}

export async function getBookDetail(
  bookId: number | string,
): Promise<BookDetailItem> {
  try {
    const response = await apiClient.get<BookDetailItem>(`/books/${bookId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching book detail:', error);
    throw error;
  }
}

export async function createBook(data: CreateBookRequest) {
  try {
    const response = await apiClient.post('/books', data);
    return response.data;
  } catch (error) {
    console.error('Error creating book:', error);
    throw error;
  }
}

export async function updateBook(bookId: string, data: Partial<UpdateBookRequest>) {
  try {
    const response = await apiClient.put(`/books/${bookId}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating book:', error);
    throw error;
  }
}

export async function deleteBook(bookId: string) {
  try {
    const response = await apiClient.delete(`/books/${bookId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting book:', error);
    throw error;
  }
}

export async function uploadBookImage(bookId: string, file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/books/${bookId}/cover`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading book image:', error);
    throw error;
  }
}
