import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getProfile } from "../api/auth";
import {
  getSubscriptions,
  subscribeToCategory,
  unsubscribeFromCategory,
  type Subscription,
} from "../api/subscriptions";
import { getCategories, type Category } from "../api/categories";
import { SubscriptionsGrid } from "./SubscriptionsGrid";
import { useSnackbar } from "./SnackbarProvider";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: showError } = useSnackbar();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [profileData, categoriesData, subscriptionsData] = await Promise.all([
        getProfile(),
        getCategories(),
        getSubscriptions(),
      ]);

      setProfile({
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        email: profileData.email || "",
        username: profileData.username || "",
      });
      setCategories(categoriesData);
      setSubscriptions(subscriptionsData);
    } catch (err) {
      console.error("Error loading user profile data:", err);
      setError("Error al cargar los datos del perfil");
      showError("Error al cargar los datos del perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubscription = async (
    categoryId: number,
    isSubscribed: boolean
  ) => {
    try {
      if (isSubscribed) {
        // Subscribe
        await subscribeToCategory(categoryId);
        success("Suscripción agregada");
      } else {
        // Unsubscribe
        await unsubscribeFromCategory(categoryId);
        success("Suscripción eliminada");
      }

      // Refresh subscriptions from backend to ensure state is in sync
      const updatedSubscriptions = await getSubscriptions();
      setSubscriptions(updatedSubscriptions);
    } catch (err: any) {
      console.error("Error toggling subscription:", err);

      // Handle specific error cases
      if (err.response?.status === 409) {
        showError("Ya estás suscrito a esta categoría");
      } else if (err.response?.status === 404) {
        showError("La categoría no existe");
      } else if (err.response?.status === 401) {
        showError("Sesión expirada. Por favor, inicia sesión nuevamente");
      } else {
        showError("Error al actualizar la suscripción");
      }

      // Refresh subscriptions on error to ensure consistency
      try {
        const updatedSubscriptions = await getSubscriptions();
        setSubscriptions(updatedSubscriptions);
      } catch (refreshErr) {
        console.error("Error refreshing subscriptions:", refreshErr);
      }
    }
  };

  const subscribedCategoryIds = subscriptions.map((sub) => sub.categoryId);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text">Mi Perfil</h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text transition-colors text-2xl leading-none"
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
              <p className="text-text-muted mt-2">Cargando...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 font-medium">{error}</p>
              <button
                onClick={loadData}
                className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Profile Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-text mb-4">
                  Información Personal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-bg p-3">
                    <p className="text-xs text-text-muted font-medium mb-1">
                      Nombre
                    </p>
                    <p className="text-sm font-semibold text-text">
                      {profile.firstName}
                    </p>
                  </div>
                  <div className="rounded-lg bg-bg p-3">
                    <p className="text-xs text-text-muted font-medium mb-1">
                      Apellido
                    </p>
                    <p className="text-sm font-semibold text-text">
                      {profile.lastName}
                    </p>
                  </div>
                  <div className="rounded-lg bg-bg p-3">
                    <p className="text-xs text-text-muted font-medium mb-1">
                      Email
                    </p>
                    <p className="text-sm font-semibold text-text">
                      {profile.email}
                    </p>
                  </div>
                  <div className="rounded-lg bg-bg p-3">
                    <p className="text-xs text-text-muted font-medium mb-1">
                      Usuario
                    </p>
                    <p className="text-sm font-semibold text-text">
                      {profile.username}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subscriptions Section */}
              <div>
                <h3 className="text-lg font-semibold text-text mb-4">
                  Mis Suscripciones a Géneros
                </h3>
                <p className="text-sm text-text-muted mb-4">
                  Activa o desactiva las categorías de interés. Los cambios se
                  guardan automáticamente.
                </p>

                {categories.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-text-muted">
                      No hay categorías disponibles
                    </p>
                  </div>
                ) : (
                  <SubscriptionsGrid
                    categories={categories}
                    subscribedCategoryIds={subscribedCategoryIds}
                    onToggle={handleToggleSubscription}
                  />
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors font-medium"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
