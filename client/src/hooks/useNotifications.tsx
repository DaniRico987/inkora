import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getNotifications, markNotificationAsRead } from '../api/notifications';
import type { Notification, NotificationResponse } from '../interfaces/notification.interface';

export interface UseNotificationsState {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
}

export interface UseNotificationsActions {
  loadNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  resetError: () => void;
}

export type UseNotificationsReturn = UseNotificationsState & UseNotificationsActions;

const NotificationsContext = createContext<UseNotificationsReturn | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data: NotificationResponse = await getNotifications();
      setNotifications(data.notifications);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar las notificaciones';
      setError(message);
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      setError(null);
      await markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notification =>
          notification.notificationId === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al marcar como leída';
      setError(message);
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        loading,
        error,
        unreadCount,
        loadNotifications,
        markAsRead,
        resetError,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): UseNotificationsReturn {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de <NotificationsProvider />');
  }
  return context;
}
