import axios from "axios";
import { AxiosHeaders } from 'axios';
import { getAccessToken } from "../auth/session";
import type { NotificationResponse, MarkReadResponse } from "../interfaces/notification.interface";

const api = axios.create({
  baseURL: "/api/v1",
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = AxiosHeaders.from(config.headers);
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

export async function getNotifications(): Promise<NotificationResponse> {
  const response = await api.get<NotificationResponse>("/notifications");
  return response.data;
}

export async function markNotificationAsRead(notificationId: number): Promise<MarkReadResponse> {
  const response = await api.patch<MarkReadResponse>(`/notifications/${notificationId}/read`);
  return response.data;
}