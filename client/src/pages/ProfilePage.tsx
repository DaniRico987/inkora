import { useEffect, useMemo, useState } from 'react';
import { Button } from '../Components/Button';
import { InputDate, InputNumber, InputSelect, InputText } from '../Components/Inputs';
import { Spinner } from '../Components/Spinner';
import { useSnackbar } from '../Components/SnackbarProvider';
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

export function ProfilePage() {
  const snackbar = useSnackbar();
  const [activeSection, setActiveSection] = useState<ProfileSection>('personal');
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileResult, categoriesResult] = await Promise.all([
        getClientProfile(),
        getCategories(),
      ]);

      setProfile(profileResult);
      setCategories(categoriesResult);
      setForm({
        firstName: profileResult.firstName ?? '',
        lastName: profileResult.lastName ?? '',
        dni: profileResult.dni ?? '',
        email: profileResult.email ?? '',
        username: profileResult.username ?? '',
        birthDate: profileResult.birthDate ? profileResult.birthDate.slice(0, 10) : '',
        birthPlace: profileResult.birthPlace ?? '',
        address: profileResult.address ?? '',
        gender: profileResult.gender ?? '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar tu perfil';
      snackbar.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const subscribedCategoryIds = useMemo(
    () => new Set(profile?.subscriptions.map((sub) => sub.categoryId) ?? []),
    [profile],
  );

  const handleSaveProfile = async () => {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el perfil';
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
    } catch (error) {
      setProfile({ ...profile, subscriptions: previousSubscriptions });
      const message = error instanceof Error ? error.message : 'No se pudo actualizar la preferencia';
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo agregar la tarjeta';
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
    } catch (error) {
      setProfile({ ...profile, cards: previousCards });
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la tarjeta';
      snackbar.error(message);
    } finally {
      setDeletingCardId(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 py-12 sm:py-16">
        <div className="mx-auto flex min-h-[55vh] max-w-6xl items-center justify-center rounded-3xl border border-border bg-bg-secondary shadow-sm">
          <Spinner size="lg" tone="calm" label="Cargando perfil..." fullScreen={false} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full max-w-3xl px-4 py-10">
        <p className="text-text-muted">No fue posible cargar tu perfil.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Mi perfil</p>
          <h1 className="mt-2 text-3xl font-bold text-text">Configuración de cuenta</h1>
        </header>

        <section className="rounded-3xl border border-border bg-bg-secondary p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <Button
              variant={activeSection === 'personal' ? 'primary' : 'secondary'}
              size="auto"
              className="rounded-full px-5 py-2 text-sm"
              onClick={() => setActiveSection('personal')}
            >
              Datos personales
            </Button>
            <Button
              variant={activeSection === 'preferences' ? 'primary' : 'secondary'}
              size="auto"
              className="rounded-full px-5 py-2 text-sm"
              onClick={() => setActiveSection('preferences')}
            >
              Preferencias
            </Button>
            <Button
              variant={activeSection === 'cards' ? 'primary' : 'secondary'}
              size="auto"
              className="rounded-full px-5 py-2 text-sm"
              onClick={() => setActiveSection('cards')}
            >
              Tarjetas
            </Button>
          </div>
        </section>

        {activeSection === 'personal' && (
          <section className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
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
          <section className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-text">Categorías literarias</h2>
            <p className="mt-1 text-sm text-text-muted">
              Activa o desactiva las categorías de las que quieres recibir novedades.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const isSubscribed = subscribedCategoryIds.has(category.categoryId);
                const isBusy = processingCategoryId === category.categoryId;
                return (
                  <div key={category.categoryId} className="rounded-2xl border border-border bg-bg p-3">
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
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
            <div className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-text">Tarjetas registradas</h2>
              {profile.cards.length === 0 ? (
                <p className="mt-3 text-sm text-text-muted">No tienes tarjetas registradas.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {profile.cards.map((card) => (
                    <article key={card.cardId} className="rounded-2xl border border-border bg-bg p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text">{card.maskedNumber}</p>
                          <p className="mt-1 text-xs text-text-muted">
                            {card.cardType === 'credit' ? 'Crédito' : 'Débito'} · Expira {formatDate(card.expirationDate)}
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

            <div className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-text">Agregar nueva tarjeta</h2>
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
      </div>
    </div>
  );
}

export default ProfilePage;
