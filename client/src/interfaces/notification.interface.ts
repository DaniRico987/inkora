export interface Notification {
  notificationId: number;
  newsId?: number;
  bookId?: number;
  notificationType: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  news?: {
    title: string;
    content: string;
    publishedAt: string;
  };
  book?: {
    title: string;
    author: string;
    coverUrl?: string;
  };
}

export interface NotificationResponse {
  notifications: Notification[];
}

export interface MarkReadResponse {
  notificationId: number;
  isRead: boolean;
}