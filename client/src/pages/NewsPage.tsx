import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { Spinner } from '../Components/Spinner';

export function NewsPage() {
  const { notifications, loading, error, markAsRead } = useNotifications();
  const [markingAsRead, setMarkingAsRead] = useState<Set<number>>(new Set());

  const handleMarkAsRead = async (notificationId: number) => {
    if (markingAsRead.has(notificationId)) return;

    setMarkingAsRead((prev) => new Set(prev).add(notificationId));
    try {
      await markAsRead(notificationId);
    } finally {
      setMarkingAsRead((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Error al cargar notificaciones
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Novedades</h1>
          <p className="text-gray-600">
            Descubre los nuevos libros disponibles en tus géneros favoritos
          </p>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-5 5v-5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.5 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No hay novedades
            </h3>
            <p className="text-gray-600">
              Cuando se publiquen nuevos libros en tus géneros suscritos,
              aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {notifications.map((notification) => (
              <div
                key={notification.notificationId}
                className={`bg-white rounded-lg shadow-sm border p-6 transition-all duration-200 ${
                  !notification.isRead
                    ? 'border-blue-200 bg-blue-50/30'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="shrink-0">
                    {notification.book?.coverUrl ? (
                      <img
                        src={notification.book.coverUrl}
                        alt={notification.book.title}
                        className="w-20 h-28 object-cover rounded-lg shadow-sm"
                      />
                    ) : (
                      <div className="w-20 h-28 bg-gray-200 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-10 h-10 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {notification.news?.title || 'Nueva notificación'}
                        </h3>
                        <p className="text-gray-700 mb-3 leading-relaxed">
                          {notification.content}
                        </p>
                        {notification.book && (
                          <div className="text-sm text-gray-600 mb-3">
                            <span className="font-medium">Libro:</span>{' '}
                            {notification.book.title}
                            {notification.book.author && (
                              <span> - {notification.book.author}</span>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {new Date(notification.createdAt).toLocaleDateString(
                            'es-ES',
                            {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            },
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.isRead && (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-blue-600 font-medium">
                              Nuevo
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex space-x-3">
                        {notification.book && (
                          <Link
                            to={`/books/${notification.bookId}`}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                          >
                            Ver libro
                          </Link>
                        )}
                        {!notification.isRead && (
                          <button
                            onClick={() =>
                              handleMarkAsRead(notification.notificationId)
                            }
                            disabled={markingAsRead.has(
                              notification.notificationId,
                            )}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {markingAsRead.has(notification.notificationId) ? (
                              <>
                                <Spinner className="w-4 h-4 mr-2" />
                                Marcando...
                              </>
                            ) : (
                              'Marcar como leída'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
