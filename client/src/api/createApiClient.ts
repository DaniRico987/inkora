import axios, { type AxiosInstance } from 'axios';
import { AxiosHeaders } from 'axios';
import { handleUnauthorizedResponse } from '../auth/logoutSession';
import { getAccessToken, saveAccessToken } from '../auth/session';

export function createApiClient(): AxiosInstance {
  const api = axios.create({
    baseURL: '/api/v1',
  });

  api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
      config.headers = AxiosHeaders.from(config.headers);
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => {
      const newToken = response.headers['x-new-token'];
      if (typeof newToken === 'string' && newToken.length > 0) {
        saveAccessToken(newToken);
      }
      return response;
    },
    (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        handleUnauthorizedResponse(error.config?.url);
      }
      return Promise.reject(error);
    },
  );

  return api;
}
