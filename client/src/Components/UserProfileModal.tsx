import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { InputDate, InputSelect, InputText } from './Inputs';
import { LocationPicker } from './LocationPicker';
import { Spinner } from './Spinner';
import { useSnackbar } from './SnackbarProvider';
import { MyHistoryView } from './profile/MyHistoryView';
import { MyReservationsView } from './profile/MyReservationsView';
import {
  getClientProfile,
  updateClientProfile,
  type ClientProfile,
} from '../api/clients';
import { getCategories, type Category } from '../api/categories';
import { subscribeToCategory, unsubscribeFromCategory } from '../api/subscriptions';
import { validateDateValue } from '../utils/dateValidation';
import { suggestAddresses, validateAddress } from '../services/addressValidation';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProfileSection = 'personal' | 'preferences' | 'cards' | 'reservations' | 'history';

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-CO');
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const snackbar = useSnackbar();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<ProfileSection>('personal');
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [processingCategoryId, setProcessingCategoryId] = useState<number | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dni: '',
    email: '',
    username: '',
    birthDate: '',
    birthPlace: '',
    address: '',
    gender: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [profileData, categoriesData] = await Promise.all([
        getClientProfile(),
        getCategories(),
      ]);

      setProfile(profileData);
      setCategories(categoriesData);
      setForm({
        firstName: profileData.firstName ?? '',
        lastName: profileData.lastName ?? '',
        dni: profileData.dni ?? '',
        email: profileData.email ?? '',
        username: profileData.username ?? '',
        birthDate: profileData.birthDate ? profileData.birthDate.slice(0, 10) : '',
        birthPlace: profileData.birthPlace ?? '',
        address: profileData.address ?? '',
        gender: profileData.gender ?? '',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar los datos del perfil';
      setError(message);
      snackbar.error(message);
    } finally {
      setLoading(false);
    }
  };

  const subscribedCategoryIds = useMemo(
    () => new Set(profile?.subscriptions.map((sub) => sub.categoryId) ?? []),
    [profile]
  );

  const handleSaveProfile = async () => {
    const birthDateError = validateDateValue(form.birthDate, 'birthDate');
    if (birthDateError) {
      snackbar.warning(birthDateError);
      return;
    }

    if (!form.address.trim()) {
      snackbar.warning('La dirección es obligatoria en tu perfil');
      return;
    }

    const isAddressValid = await validateAddress(form.address, '');
    if (!isAddressValid) {
      const suggestions = await suggestAddresses(form.address, '');
      const suggestionText = suggestions.length > 0
        ? ` Sugerencias: ${suggestions.slice(0, 3).map((suggestion) => suggestion.label).join(' · ')}`
        : '';
      snackbar.warning(`No pudimos verificar la dirección ingresada.${suggestionText}`);
      return;
    }

    try {
      setSavingProfile(true);
      const updated = await updateClientProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        username: form.username,
        birthDate: form.birthDate || undefined,
        birthPlace: form.birthPlace || undefined,
        address: form.address || undefined,
        gender: form.gender || undefined,
      });
      setProfile(updated);
      snackbar.success('Datos personales actualizados');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar el perfil';
      snackbar.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleCategory = async (categoryId: number) => {
    if (!profile) return;

    const isSubscribed = subscribedCategoryIds.has(categoryId);
    const previousSubscriptions = profile.subscriptions;
    const categoryName = categories.find((category) => category.categoryId === categoryId)?.name ?? 'Categoría';

    const nextSubscriptions = isSubscribed
      ? previousSubscriptions.filter((sub) => sub.categoryId !== categoryId)
      : [
        ...previousSubscriptions,
        {
          subscriptionId: -Date.now(),
          categoryId,
          categoryName,
          subscribedAt: new Date().toISOString(),
        },
      ];

    setProfile({ ...profile, subscriptions: nextSubscriptions });
    setProcessingCategoryId(categoryId);

    try {
      if (isSubscribed) {
        await unsubscribeFromCategory(categoryId);
        snackbar.success(`Te desuscribiste de ${categoryName}`);
      } else {
        await subscribeToCategory(categoryId);
        snackbar.success(`Te suscribiste a ${categoryName}`);
      }

      const refreshed = await getClientProfile();
      setProfile(refreshed);
    } catch (err) {
      setProfile({ ...profile, subscriptions: previousSubscriptions });
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la preferencia';
      snackbar.error(message);
    } finally {
      setProcessingCategoryId(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-black/50 px-4 py-20 sm:py-24"
      onClick={onClose}
    >
      <div
        className="profile-modal-scrollbar h-[min(86vh,54rem)] w-full max-w-6xl overflow-y-auto rounded-3xl border border-border bg-bg-secondary shadow-xl sm:h-[min(84vh,52rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text">Mi Perfil</h2>
            <button
              onClick={onClose}
              className="text-2xl leading-none text-text-muted transition-colors hover:text-text"
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Spinner size="lg" tone="calm" label="Cargando perfil..." fullScreen={false} />
            </div>
          ) : error ? (
            <div className="space-y-3 py-10 text-center">
              <p className="font-medium text-red-500">{error}</p>
              <div className="flex justify-center">
                <Button variant="primary" size="auto" className="rounded-full px-5 py-2 text-sm" onClick={loadData}>
                  Reintentar
                </Button>
              </div>
            </div>
          ) : !profile ? (
            <div className="py-10 text-center text-text-muted">No fue posible cargar tu perfil.</div>
          ) : (
            <div className="space-y-6">
              <section className="p-4">
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                  <button
                    className={`${activeSection === 'personal' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border bg-bg-secondary text-text-muted hover:text-text'} rounded-2xl border px-3 py-2 text-sm font-semibold transition-all duration-150 cursor-pointer`}
                    onClick={() => setActiveSection('personal')}
                  >
                    Datos personales
                  </button>
                  <button
                    className={`${activeSection === 'preferences' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border bg-bg-secondary text-text-muted hover:text-text'} rounded-2xl border px-3 py-2 text-sm font-semibold transition-all duration-150 cursor-pointer`}
                    onClick={() => setActiveSection('preferences')}
                  >
                    Preferencias
                  </button>
                  <button
                    className={`${activeSection === 'cards' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border bg-bg-secondary text-text-muted hover:text-text'} rounded-2xl border px-3 py-2 text-sm font-semibold transition-all duration-150 cursor-pointer`}
                    onClick={() => setActiveSection('cards')}
                  >
                    Tarjetas
                  </button>
                  <button
                    className={`${activeSection === 'reservations' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border bg-bg-secondary text-text-muted hover:text-text'} rounded-2xl border px-3 py-2 text-sm font-semibold transition-all duration-150 cursor-pointer`}
                    onClick={() => setActiveSection('reservations')}
                  >
                    Mis reservas
                  </button>
                  <button
                    className={`${activeSection === 'history' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border bg-bg-secondary text-text-muted hover:text-text'} rounded-2xl border px-3 py-2 text-sm font-semibold transition-all duration-150 cursor-pointer`}
                    onClick={() => setActiveSection('history')}
                  >
                    Mi historial
                  </button>
                </div>
              </section>

              {activeSection === 'personal' && (
                <section className="rounded-3xl border border-border bg-bg p-5 shadow-sm sm:p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputText
                      label="Nombres"
                      value={form.firstName}
                      validationType="name"
                      onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                    />
                    <InputText
                      label="Apellidos"
                      value={form.lastName}
                      validationType="name"
                      onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                    />
                    <InputText label="DNI" value={form.dni} disabled />
                    <InputText
                      label="Correo"
                      value={form.email}
                      validationType="email"
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    />
                    <InputText
                      label="Usuario"
                      value={form.username}
                      validationType="username"
                      onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                    />
                    <InputDate
                      label="Fecha de nacimiento"
                      value={form.birthDate}
                      dateValidationMode="birthDate"
                      onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
                    />
                    <div>
                      <LocationPicker
                        label="Lugar de nacimiento"
                        value={form.birthPlace}
                        onChange={(birthPlace) => setForm((prev) => ({ ...prev, birthPlace }))}
                      />
                    </div>
                    <InputSelect
                      label="Género"
                      value={form.gender}
                      options={[
                        { value: '', label: 'Selecciona tu género' },
                        { value: 'male', label: 'Masculino' },
                        { value: 'female', label: 'Femenino' },
                        { value: 'other', label: 'Otro' },
                        { value: 'prefer_not_say', label: 'Prefiero no decir' },
                      ]}
                      onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
                    />
                  </div>
                  <InputText
                    label="Dirección"
                    value={form.address}
                    validationType="address"
                    onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      size="auto"
                      loading={savingProfile}
                      className="rounded-full px-5 py-2 text-sm"
                      onClick={handleSaveProfile}
                    >
                      Guardar cambios
                    </Button>
                  </div>
                </section>
              )}

              {activeSection === 'preferences' && (
                <section className="rounded-3xl border border-border bg-bg p-5 shadow-sm sm:p-6">
                  <h3 className="text-lg font-semibold text-text">Categorías literarias</h3>
                  <p className="mt-1 text-sm text-text-muted">
                    Activa o desactiva las categorías de las que quieres recibir novedades.
                  </p>
                  <div className="mt-4 grid gap-2">
                    {categories.map((category) => {
                      const isSubscribed = subscribedCategoryIds.has(category.categoryId);
                      const isBusy = processingCategoryId === category.categoryId;
                      return (
                        <div key={category.categoryId} className="rounded-2xl border border-border bg-bg-secondary px-4 py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-text">{category.name}</p>
                              {category.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-text-muted">{category.description}</p>
                              )}
                            </div>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={isSubscribed}
                              aria-label={`${isSubscribed ? 'Desuscribir de' : 'Suscribir a'} ${category.name}`}
                              disabled={isBusy}
                              onClick={() => handleToggleCategory(category.categoryId)}
                              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-babyblue-400/40 focus:ring-offset-2 focus:ring-offset-bg disabled:cursor-wait disabled:opacity-60 ${isSubscribed ? 'border-primary-500 bg-primary-500/85' : 'border-border bg-bg'}`}
                            >
                              <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isSubscribed ? 'translate-x-5' : 'translate-x-1'}`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {activeSection === 'cards' && (
                <section className="rounded-3xl border border-border bg-bg p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-text">Tarjetas registradas</h3>
                      <p className="mt-1 text-sm text-text-muted">
                        Vista previa de tus tarjetas y acceso directo al monedero virtual.
                      </p>
                    </div>
                    <Link
                      to="/wallet"
                      onClick={onClose}
                      className="sm:ml-auto inline-flex shrink-0 items-center justify-center rounded-full bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400/40"
                    >
                      Ir al monedero virtual
                    </Link>
                  </div>

                  <div className="mt-5 rounded-2xl border border-border bg-bg-secondary p-4">
                    <p className="text-sm font-semibold text-text">
                      {profile.cards.length} tarjeta{profile.cards.length !== 1 ? 's' : ''} registrada
                      {profile.cards.length !== 1 ? 's' : ''}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      El saldo y las recargas se administran desde el monedero virtual.
                    </p>

                    {profile.cards.length === 0 ? (
                      <p className="mt-4 text-sm text-text-muted">No tienes tarjetas registradas.</p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {profile.cards.map((card) => (
                          <article key={card.cardId} className="rounded-2xl border border-border bg-bg p-4">
                            <p className="text-sm font-semibold text-text">{card.maskedNumber}</p>
                            <p className="mt-1 text-xs text-text-muted">
                              {card.cardType === 'credit' ? 'Crédito' : 'Débito'} · Expira {formatDate(card.expirationDate)}
                            </p>
                            <p className="mt-1 text-xs text-text-muted">{card.cardHolder}</p>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {activeSection === 'reservations' && (
                <MyReservationsView
                  embedded
                  historyOnly
                  onGoToCart={() => {
                    onClose();
                    navigate('/cart');
                  }}
                />
              )}

              {activeSection === 'history' && (
                <MyHistoryView
                  embedded
                  showReservations={false}
                  onOpenPurchaseDetails={onClose}
                />
              )}

            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
