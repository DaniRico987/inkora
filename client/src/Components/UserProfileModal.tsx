import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { InputDate, InputNumber, InputSelect, InputText } from './Inputs';
import { Spinner } from './Spinner';
import { useSnackbar } from './SnackbarProvider';
import {
  createClientCard,
  deleteClientCard,
  getClientProfile,
  updateClientProfile,
  type ClientCardType,
  type ClientProfile,
} from '../api/clients';
import { getCategories, type Category } from '../api/categories';
import { subscribeToCategory, unsubscribeFromCategory } from '../api/subscriptions';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ProfileSection = 'personal' | 'preferences' | 'cards';

type CardFormState = {
  number: string;
  cardHolder: string;
  expirationDate: string;
  cardType: ClientCardType;
};

const initialCardForm: CardFormState = {
  number: '',
  cardHolder: '',
  expirationDate: '',
  cardType: 'credit',
};

function maskCardNumber(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, '');
  if (!digits) return '';
  const visible = digits.slice(-4);
  return `**** **** **** ${visible}`;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-CO');
}

function isBirthDateAllowed(birthDate: string): boolean {
  if (!birthDate) return true;
  const selectedDate = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(selectedDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate > today) return false;
  const minBirthDate = new Date(today);
  minBirthDate.setFullYear(minBirthDate.getFullYear() - 120);
  return selectedDate >= minBirthDate;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const snackbar = useSnackbar();
  const [activeSection, setActiveSection] = useState<ProfileSection>('personal');
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [processingCategoryId, setProcessingCategoryId] = useState<number | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<number | null>(null);
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
  const [cardForm, setCardForm] = useState<CardFormState>(initialCardForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
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
    if (!isBirthDateAllowed(form.birthDate)) {
      snackbar.warning('La fecha de nacimiento debe ser válida y no superar 120 años.');
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

  const handleAddCard = async () => {
    if (!cardForm.number || cardForm.number.replace(/\D/g, '').length < 12) {
      snackbar.warning('Ingresa un número de tarjeta válido');
      return;
    }

    try {
      setSavingCard(true);
      const updated = await createClientCard({
        maskedNumber: maskCardNumber(cardForm.number),
        cardType: cardForm.cardType,
        expirationDate: cardForm.expirationDate,
        cardHolder: cardForm.cardHolder.trim(),
      });
      setProfile(updated);
      setCardForm(initialCardForm);
      snackbar.success('Tarjeta agregada correctamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo agregar la tarjeta';
      snackbar.error(message);
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = async (cardId: number) => {
    if (!profile) return;

    const previousCards = profile.cards;
    setProfile({ ...profile, cards: previousCards.filter((card) => card.cardId !== cardId) });
    setDeletingCardId(cardId);

    try {
      await deleteClientCard(cardId);
      snackbar.success('Tarjeta eliminada');
    } catch (err) {
      setProfile({ ...profile, cards: previousCards });
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la tarjeta';
      snackbar.error(message);
    } finally {
      setDeletingCardId(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-border bg-bg-secondary shadow-xl">
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
                <div className="flex flex-row">
                  <button
                    className={`${activeSection === 'personal' ? 'font-bold text-text border-b-2 border-primary-500' : 'text-text-muted'} w-1/3 px-5 py-2 text-base transition-all duration-150 cursor-pointer`}
                    onClick={() => setActiveSection('personal')}
                  >
                    Datos personales
                  </button>
                  <button
                    className={`${activeSection === 'preferences' ? 'font-bold text-text border-b-2 border-primary-500' : 'text-text-muted'} w-1/3 px-5 py-2 text-base transition-all duration-150 cursor-pointer`}
                    onClick={() => setActiveSection('preferences')}
                  >
                    Preferencias
                  </button>
                  <button
                    className={`${activeSection === 'cards' ? 'font-bold text-text border-b-2 border-primary-500' : 'text-text-muted'} w-1/3 px-5 py-2 text-base transition-all duration-150 cursor-pointer`}
                    onClick={() => setActiveSection('cards')}
                  >
                    Tarjetas
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
                    <InputText
                      label="Lugar de nacimiento"
                      value={form.birthPlace}
                      validationType="name"
                      onChange={(event) => setForm((prev) => ({ ...prev, birthPlace: event.target.value }))}
                    />
                    <InputText
                      label="Género"
                      value={form.gender}
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
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => {
                      const isSubscribed = subscribedCategoryIds.has(category.categoryId);
                      const isBusy = processingCategoryId === category.categoryId;
                      return (
                        <div key={category.categoryId} className="rounded-2xl border border-border bg-bg-secondary p-3">
                          <p className="text-sm font-semibold text-text">{category.name}</p>
                          {category.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-text-muted">{category.description}</p>
                          )}
                          <div className="mt-3">
                            <Button
                              variant={isSubscribed ? 'primary' : 'secondary'}
                              size="auto"
                              loading={isBusy}
                              className="rounded-full px-4 py-1.5 text-xs"
                              onClick={() => handleToggleCategory(category.categoryId)}
                            >
                              {isSubscribed ? 'Suscrito' : 'Suscribirme'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {activeSection === 'cards' && (
                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)]">
                  <div className="rounded-3xl border border-border bg-bg p-5 shadow-sm sm:p-6">
                    <h3 className="text-lg font-semibold text-text">Tarjetas registradas</h3>
                    {profile.cards.length === 0 ? (
                      <p className="mt-3 text-sm text-text-muted">No tienes tarjetas registradas.</p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {profile.cards.map((card) => (
                          <article key={card.cardId} className="rounded-2xl border border-border bg-bg-secondary p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-text">{card.maskedNumber}</p>
                                <p className="mt-1 text-xs text-text-muted">
                                  {card.cardType === 'credit' ? 'Crédito' : 'Débito'} · Expira{' '}
                                  {formatDate(card.expirationDate)}
                                </p>
                                <p className="mt-1 text-xs text-text-muted">{card.cardHolder}</p>
                              </div>
                              <Button
                                variant="destructive"
                                size="auto"
                                loading={deletingCardId === card.cardId}
                                className="rounded-full px-3 py-1 text-xs"
                                onClick={() => handleDeleteCard(card.cardId)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl border border-border bg-bg p-5 shadow-sm sm:p-6">
                    <h3 className="text-lg font-semibold text-text">Agregar nueva tarjeta</h3>
                    <InputNumber
                      label="Número de tarjeta"
                      value={cardForm.number}
                      length={19}
                      onChange={(event) => setCardForm((prev) => ({ ...prev, number: event.target.value }))}
                    />
                    <InputText
                      label="Titular"
                      value={cardForm.cardHolder}
                      validationType="name"
                      onChange={(event) => setCardForm((prev) => ({ ...prev, cardHolder: event.target.value }))}
                    />
                    <InputDate
                      label="Fecha de expiración"
                      value={cardForm.expirationDate}
                      onChange={(event) => setCardForm((prev) => ({ ...prev, expirationDate: event.target.value }))}
                    />
                    <InputSelect
                      label="Tipo de tarjeta"
                      value={cardForm.cardType}
                      options={[
                        { label: 'Crédito', value: 'credit' },
                        { label: 'Débito', value: 'debit' },
                      ]}
                      onChange={(event) =>
                        setCardForm((prev) => ({ ...prev, cardType: event.target.value as ClientCardType }))
                      }
                    />
                    <Button
                      variant="primary"
                      size="full"
                      loading={savingCard}
                      className="rounded-full py-2 text-sm"
                      onClick={handleAddCard}
                    >
                      Guardar tarjeta
                    </Button>
                  </div>
                </section>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="secondary" size="auto" className="rounded-full px-6 py-2 text-sm" onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
