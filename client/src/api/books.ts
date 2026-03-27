import axios from 'axios';
import type { CreateBookRequest, UpdateBookRequest } from '../interfaces/admin';
import { getAccessToken } from '../auth/session';

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

export async function getBooks(page: number = 1, limit: number = 10) {
  try {
    const response = await apiClient.get('/books', {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching books:', error);
    throw error;
  }
}

export async function searchBooks(query: string, page: number = 1) {
  try {
    const response = await apiClient.get('/books/search', {
      params: { title: query, page },
    });
    return response.data;
  } catch (error) {
    console.error('Error searching books:', error);
    throw error;
  }
}

export async function getBookDetail(bookId: string) {
  try {
    const response = await apiClient.get(`/books/${bookId}`);
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
