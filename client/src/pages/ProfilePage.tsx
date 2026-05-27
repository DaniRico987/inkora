import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../Components/Button';
import { InputDate, InputSelect, InputText } from '../Components/Inputs';
import { LocationPicker } from '../Components/LocationPicker';
import { Spinner } from '../Components/Spinner';
import { useSnackbar } from '../Components/SnackbarProvider';
import {
  getClientProfile,
  updateClientProfile,
  type ClientProfile,
} from '../api/clients';
import { getCategories, type Category } from '../api/categories';
import {
  subscribeToCategory,
  unsubscribeFromCategory,
} from '../api/subscriptions';
import { validateDateValue } from '../utils/dateValidation';
import { suggestAddresses, validateAddress } from '../services/addressValidation';

type ProfileSection = 'personal' | 'preferences' | 'cards';

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-CO');
}

function isBirthdayToday(isoDate: string): boolean {
  if (!isoDate) return false;

  const birthParts = isoDate.slice(5, 10);
  const todayParts = new Date().toISOString().slice(5, 10);
  return birthParts === todayParts;
}

export function ProfilePage() {
  const snackbar = useSnackbar();
  const [activeSection, setActiveSection] =
    useState<ProfileSection>('personal');
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [processingCategoryId, setProcessingCategoryId] = useState<
    number | null
  >(null);
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
        birthDate: profileResult.birthDate
          ? profileResult.birthDate.slice(0, 10)
          : '',
        birthPlace: profileResult.birthPlace ?? '',
        address: profileResult.address ?? '',
        gender: profileResult.gender ?? '',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo cargar tu perfil';
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

  const birthdayBanner = useMemo(() => {
    if (!profile?.activeBirthdayVoucher) return null;
    if (!isBirthdayToday(profile.birthDate)) return null;

    return profile.activeBirthdayVoucher;
  }, [profile]);

  const handleCopyVoucherCode = async () => {
    if (!birthdayBanner) return;

    try {
      await navigator.clipboard.writeText(birthdayBanner.code);
      snackbar.success('Código de bono copiado');
    } catch {
      snackbar.warning('No se pudo copiar el código automáticamente');
    }
  };

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

    // Client-side validations to match register page checks
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.firstName.trim().length === 0) {
      snackbar.warning('Los nombres son requeridos.');
      return;
    }
    if (form.lastName.trim().length === 0) {
      snackbar.warning('Los apellidos son requeridos.');
      return;
    }
    if (form.firstName.length > 100) {
      snackbar.warning('El nombre no debe exceder 100 caracteres.');
      return;
    }
    if (form.lastName.length > 100) {
      snackbar.warning('El apellido no debe exceder 100 caracteres.');
      return;
    }
    if (form.email && !emailRegex.test(form.email.trim())) {
      snackbar.warning('Ingresa un correo electrónico válido.');
      return;
    }
    if (
      form.username &&
      (form.username.length < 3 || form.username.length > 50)
    ) {
      snackbar.warning(
        'El nombre de usuario debe tener entre 3 y 50 caracteres.',
      );
      return;
    }
    if (form.username && !/^[a-zA-Z0-9_]+$/.test(form.username)) {
      snackbar.warning(
        'El nombre de usuario solo puede contener letras, números y guiones bajos.',
      );
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
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar el perfil';
      snackbar.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleCategory = async (categoryId: number) => {
    if (!profile) return;

    const isSubscribed = subscribedCategoryIds.has(categoryId);
    const previousSubscriptions = profile.subscriptions;
    const categoryName =
      categories.find((category) => category.categoryId === categoryId)?.name ??
      'Categoría';

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
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la preferencia';
      snackbar.error(message);
    } finally {
      setProcessingCategoryId(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 py-12 sm:py-16">
        <div className="mx-auto flex min-h-[55vh] max-w-6xl items-center justify-center rounded-3xl border border-border bg-bg-secondary shadow-sm">
          <Spinner
            size="lg"
            tone="calm"
            label="Cargando perfil..."
            fullScreen={false}
          />
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Mi perfil
          </p>
          <h1 className="mt-2 text-3xl font-bold text-text">
            Configuración de cuenta
          </h1>
        </header>

        {birthdayBanner && (
          <section className="overflow-hidden rounded-3xl border border-amber-200 bg-linear-to-r from-amber-50 via-bg-secondary to-babyblue-50 shadow-sm">
            <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                  Bono de cumpleaños activo
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-text">
                    Feliz cumpleaños, {profile.firstName}.
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-text-muted">
                    Tienes disponible un descuento del{' '}
                    {birthdayBanner.discountPercentage}% con el código{' '}
                    {birthdayBanner.code}. Puedes usarlo en tu próxima compra
                    antes de que venza el {formatDate(birthdayBanner.expiresAt)}
                    .
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCopyVoucherCode}
                  className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-white px-5 py-3 text-sm font-semibold text-amber-900 transition hover:border-amber-400 hover:bg-amber-100"
                >
                  Copiar código
                </button>
                <a
                  href="/checkout"
                  className="inline-flex items-center justify-center rounded-full bg-babyblue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-babyblue-700"
                >
                  Ir al checkout
                </a>
              </div>
            </div>
          </section>
        )}

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
              variant={
                activeSection === 'preferences' ? 'primary' : 'secondary'
              }
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
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    firstName: event.target.value,
                  }))
                }
              />
              <InputText
                label="Apellidos"
                value={form.lastName}
                validationType="name"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lastName: event.target.value }))
                }
              />
              <InputText label="DNI" value={form.dni} disabled />
              <InputText
                label="Correo"
                value={form.email}
                validationType="email"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
              <InputText
                label="Usuario"
                value={form.username}
                validationType="username"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, username: event.target.value }))
                }
              />
              <InputDate
                label="Fecha de nacimiento"
                value={form.birthDate}
                dateValidationMode="birthDate"
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    birthDate: event.target.value,
                  }))
                }
              />
              <div>
                <LocationPicker
                  label="Lugar de nacimiento"
                  value={form.birthPlace}
                  onChange={(birthPlace) =>
                    setForm((prev) => ({ ...prev, birthPlace }))
                  }
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
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, gender: event.target.value }))
                }
              />
            </div>
            <InputText
              label="Dirección"
              value={form.address}
              validationType="address"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, address: event.target.value }))
              }
              required
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
            <h2 className="text-lg font-semibold text-text">
              Categorías literarias
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Activa o desactiva las categorías de las que quieres recibir
              novedades.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const isSubscribed = subscribedCategoryIds.has(
                  category.categoryId,
                );
                const isBusy = processingCategoryId === category.categoryId;
                return (
                  <div
                    key={category.categoryId}
                    className="rounded-2xl border border-border bg-bg p-3"
                  >
                    <p className="text-sm font-semibold text-text">
                      {category.name}
                    </p>
                    {category.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-text-muted">
                        {category.description}
                      </p>
                    )}
                    <div className="mt-3">
                      <Button
                        variant={isSubscribed ? 'primary' : 'secondary'}
                        size="auto"
                        loading={isBusy}
                        className="rounded-full px-4 py-1.5 text-xs"
                        onClick={() =>
                          handleToggleCategory(category.categoryId)
                        }
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
          <section className="rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Tarjetas registradas
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  Vista previa de tus tarjetas y acceso directo al monedero
                  virtual.
                </p>
              </div>
              <Link
                to="/wallet"
                className="sm:ml-auto inline-flex shrink-0 items-center justify-center rounded-full bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-400/40"
              >
                Ir al monedero virtual
              </Link>
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-bg p-4">
              <p className="text-sm font-semibold text-text">
                {profile.cards.length} tarjeta
                {profile.cards.length !== 1 ? 's' : ''} registrada
                {profile.cards.length !== 1 ? 's' : ''}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                El saldo y las recargas se administran desde el monedero
                virtual.
              </p>

              {profile.cards.length === 0 ? (
                <p className="mt-4 text-sm text-text-muted">
                  No tienes tarjetas registradas.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {profile.cards.map((card) => (
                    <article
                      key={card.cardId}
                      className="rounded-2xl border border-border bg-bg-secondary p-4"
                    >
                      <p className="text-sm font-semibold text-text">
                        {card.maskedNumber}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {card.cardType === 'credit' ? 'Crédito' : 'Débito'} ·
                        Expira {formatDate(card.expirationDate)}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {card.cardHolder}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
