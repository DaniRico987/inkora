import type { NotificationResponse, MarkReadResponse } from "../interfaces/notification.interface";
import { createApiClient } from "./createApiClient";

const api = createApiClient();

export async function getNotifications(): Promise<NotificationResponse> {
  const response = await api.get<NotificationResponse>("/notifications");
  return response.data;
}

export async function markNotificationAsRead(notificationId: number): Promise<MarkReadResponse> {
  const response = await api.patch<MarkReadResponse>(`/notifications/${notificationId}/read`);
  return response.data;
}