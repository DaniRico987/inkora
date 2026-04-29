import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { InputText, InputPassword, InputSelect, InputNumber, InputDate } from '../Components/Inputs';
import { Button } from '../Components/Button';
import { AuthHomeButton } from '../Components/AuthHomeButton';
import { useTheme } from '../theme/useTheme';
import { extractAuthError, login, register } from '../api/auth';
import { getCategories, type Category } from '../api/categories';
import { saveAccessToken } from '../auth/session';
import { LocationPicker } from '../Components/LocationPicker';
import { validateDateValue } from '../utils/dateValidation';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

type FormData = {
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  address: string;
  gender: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  categoryIds: number[];
};

type FormErrors = Partial<Record<keyof FormData, string>>;

type PasswordStrength = 'débil' | 'media' | 'fuerte';

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return 'débil';
  if (score <= 4) return 'media';
  return 'fuerte';
}

export function RegisterPage() {
  useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const authOriginState =
    typeof location.state === 'object' &&
      location.state !== null &&
      'from' in location.state
      ? { from: (location.state as { from?: string }).from }
      : undefined;

  const [formData, setFormData] = useState<FormData>({
    dni: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    birthPlace: '',
    address: '',
    gender: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    categoryIds: [],
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const hasPassword = formData.password.trim().length > 0;
  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password],
  );

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const data = await getCategories();
        if (isMounted) {
          setCategories(data);
        }
      } catch {
        if (isMounted) {
          setErrorMessage('No se pudieron cargar las preferencias literarias.');
        }
      } finally {
        if (isMounted) {
          setCategoriesLoading(false);
        }
      }
    };

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const toggleCategory = (categoryId: number) => {
    if (!Number.isFinite(categoryId)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
    setFormErrors((prev) => ({ ...prev, categoryIds: undefined }));
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    const {
      dni,
      firstName,
      lastName,
      birthDate,
      email,
      username,
      password,
      confirmPassword,
    } = formData;

    if (!dni.trim()) nextErrors.dni = 'El DNI es requerido.';
    if (!firstName.trim()) nextErrors.firstName = 'Los nombres son requeridos.';
    if (!lastName.trim()) nextErrors.lastName = 'Los apellidos son requeridos.';
    if (!birthDate) nextErrors.birthDate = 'La fecha de nacimiento es requerida.';
    if (!email.trim()) nextErrors.email = 'El correo es requerido.';
    if (!username.trim()) nextErrors.username = 'El username es requerido.';
    if (!password.trim()) nextErrors.password = 'La contraseña es requerida.';
    if (!confirmPassword.trim()) nextErrors.confirmPassword = 'Debes confirmar la contraseña.';

    if (birthDate) {
      const birthDateError = validateDateValue(birthDate, 'birthDate');
      if (birthDateError) {
        nextErrors.birthDate = birthDateError;
      }
    }

    if (dni.length < 6 || dni.length > 20) {
      nextErrors.dni = 'El DNI debe tener entre 6 y 20 caracteres.';
    }

    if (firstName.length > 100) {
      nextErrors.firstName = 'El nombre no debe exceder 100 caracteres.';
    }

    if (lastName.length > 100) {
      nextErrors.lastName = 'El apellido no debe exceder 100 caracteres.';
    }

    if (email.trim() && !emailRegex.test(email.trim())) {
      nextErrors.email = 'Ingresa un correo electrónico válido.';
    }

    if (username.length < 3 || username.length > 50) {
      nextErrors.username =
        'El nombre de usuario debe tener entre 3 y 50 caracteres.';
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      nextErrors.username =
        'El nombre de usuario solo puede contener letras, números y guiones bajos.';
    }

    if (password.length < 8) {
      nextErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (!passwordPolicy.test(password)) {
      nextErrors.password = 'La contraseña debe incluir mayúsculas, minúsculas y números.';
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    if (categories.length > 0 && formData.categoryIds.length === 0) {
      nextErrors.categoryIds = 'Selecciona al menos una preferencia literaria.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setFormErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await register({
        dni: formData.dni.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        birthDate: formData.birthDate,
        birthPlace: formData.birthPlace.trim() || undefined,
        address: formData.address.trim() || undefined,
        gender: formData.gender || undefined,
        email: formData.email.trim(),
        username: formData.username.trim(),
        password: formData.password,
        categoryIds: formData.categoryIds,
      });

      const loginResponse = await login({
        identifier: formData.username.trim(),
        password: formData.password,
        recaptchaToken: 'captcha-ok',
      });
      saveAccessToken(loginResponse.accessToken);

      setSuccessMessage(
        'Cuenta creada exitosamente. Redirigiendo al catálogo...',
      );
      setFormData({
        dni: '',
        firstName: '',
        lastName: '',
        birthDate: '',
        birthPlace: '',
        address: '',
        gender: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        categoryIds: [],
      });

      setTimeout(() => {
        navigate('/', { replace: true });
      }, 600);
    } catch (error) {
      const authError = extractAuthError(error);
      const message = authError.message || '';

      if (/email already exists/i.test(message)) {
        setFormErrors((prev) => ({
          ...prev,
          email: 'Este correo ya está registrado.',
        }));
        setErrorMessage(
          'No se pudo crear la cuenta. Revisa los campos marcados.',
        );
        return;
      }

      if (/username already exists/i.test(message)) {
        setFormErrors((prev) => ({
          ...prev,
          username: 'Este username ya está en uso.',
        }));
        setErrorMessage(
          'No se pudo crear la cuenta. Revisa los campos marcados.',
        );
        return;
      }

      setErrorMessage(
        message ||
        'No se pudo crear la cuenta. Verifica la información e intenta de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  const genderOptions = [
    { value: '', label: 'Selecciona tu género' },
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Femenino' },
    { value: 'other', label: 'Otro' },
    { value: 'prefer_not_say', label: 'Prefiero no decir' },
  ];

  return (
    <div className="w-full flex items-center justify-center px-4 py-8 md:py-10">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-white/30 bg-white/10 shadow-2xl backdrop-blur-2xl">
        <div className="grid md:grid-cols-2 min-h-auto md:min-h-144">
          <div className="relative isolate overflow-hidden bg-bg-secondary">
            <div className="absolute left-0 top-0 z-20 h-96 w-96 sm:h-136 sm:w-136 -translate-x-1/4 -translate-y-1/4 rounded-full bg-linear-to-br from-skyblue-100 via-skyblue-300 to-primary-600 border border-white/55 shadow-[inset_-26px_-26px_52px_rgba(10,35,85,0.35),inset_22px_22px_42px_rgba(255,255,255,0.28),0_16px_35px_rgba(22,63,136,0.28)]">
              <span className="absolute left-[18%] top-[15%] h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/40 blur-[1px]" />
              <div className="absolute left-[58%] top-[58%] w-44 sm:w-56 -translate-x-1/2 -translate-y-1/2 pr-2">
                <h2 className="text-xl sm:text-3xl font-semibold leading-tight text-white">
                  ¡Únete a Inkora!
                </h2>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/90">
                  Acceso a miles de libros y únete a una comunidad de lectores
                  apasionados.
                </p>
              </div>
            </div>

            <div className="absolute left-[31%] top-[52%] z-30 h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-linear-to-br from-skyblue-100 via-skyblue-300 to-primary-600 border border-white/55 shadow-[inset_-18px_-18px_34px_rgba(10,35,85,0.3),inset_12px_12px_20px_rgba(255,255,255,0.28),0_12px_24px_rgba(22,63,136,0.2)]">
              <span className="absolute left-[16%] top-[14%] h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/35 blur-[1px]" />
            </div>

            <div className="absolute left-[3%] bottom-[8%] z-10 h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-linear-to-br from-skyblue-100 via-skyblue-300 to-primary-600 border border-white/55 shadow-[inset_-14px_-14px_26px_rgba(10,35,85,0.28),inset_10px_10px_16px_rgba(255,255,255,0.26),0_10px_20px_rgba(22,63,136,0.2)]">
              <span className="absolute left-[18%] top-[14%] h-6 w-6 rounded-full bg-white/35 blur-[1px]" />
            </div>
          </div>

          <div className="px-6 py-8 sm:px-9 sm:py-10 md:px-10 md:py-12 bg-bg-secondary overflow-y-auto max-h-screen md:max-h-none">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                Creación de cuenta
              </p>
              <AuthHomeButton />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-text mb-2">
              Crear cuenta
            </h1>
            <p className="text-sm text-text-muted mb-6">
              Completa el formulario para acceder a tu mundo de lectura.
            </p>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 [&_input]:border-border [&_input]:bg-bg-input [&_input]:text-text [&_input]:placeholder:text-placeholder [&_input]:focus:border-border-focus [&_input]:shadow-none [&_label>span:first-of-type]:border-border [&_label>span:last-of-type]:text-label [&_select]:border-border [&_select]:bg-bg-input [&_select]:text-text [&_select]:focus:border-border-focus [&_select]:shadow-none"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                <div>
                  <InputNumber
                    label="DNI"
                    name="dni"
                    autoComplete="off"
                    value={formData.dni}
                    onChange={handleInputChange}
                    length={20}
                  />
                  {formErrors.dni && <p className="text-xs text-red-300">{formErrors.dni}</p>}
                </div>
                <div>
                  <InputText
                    label="Nombre"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    maxLength={100}
                    validationType="name"
                  />
                  {formErrors.firstName && <p className="text-xs text-red-300">{formErrors.firstName}</p>}
                </div>
                <div>
                  <InputText
                    label="Apellido"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    maxLength={100}
                    validationType="name"
                  />
                  {formErrors.lastName && <p className="text-xs text-red-300">{formErrors.lastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                <div>
                  <InputDate
                    label="Fecha de nacimiento"
                    name="birthDate"
                    value={formData.birthDate}
                    dateValidationMode="birthDate"
                    onChange={handleInputChange}
                  />
                  {formErrors.birthDate && <p className="text-xs text-red-300">{formErrors.birthDate}</p>}
                </div>
                <div>
                  <InputSelect
                    label="Género"
                    name="gender"
                    options={genderOptions}
                    value={formData.gender}
                    onChange={handleInputChange}
                  />
                  {formErrors.gender && <p className="text-xs text-red-300">{formErrors.gender}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-3">
                <LocationPicker
                  label="Lugar de nacimiento"
                  value={formData.birthPlace}
                  onChange={(birthPlace) => {
                    setFormData((prev) => ({ ...prev, birthPlace }));
                  }}
                />
                <div>
                  <InputText
                    label="Dirección"
                    name="address"
                    type="text"
                    autoComplete="street-address"
                    value={formData.address}
                    onChange={handleInputChange}
                    maxLength={255}
                    validationType="address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                <div>
                  <InputText
                    label="Correo electrónico"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    validationType="email"
                  />
                  {formErrors.email && <p className="text-xs text-red-300">{formErrors.email}</p>}
                </div>
                <div>
                  <InputText
                    label="Nombre de usuario"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    maxLength={50}
                    validationType="username"
                  />
                  {formErrors.username && <p className="text-xs text-red-300">{formErrors.username}</p>}
                </div>
              </div>

              {/* Row 5: Password, Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                <div>
                  <InputPassword
                    label="Contraseña"
                    name="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  {formErrors.password && (
                    <p className="text-xs text-red-300">
                      {formErrors.password}
                    </p>
                  )}
                </div>
                <div>
                  <InputPassword
                    label="Confirmar contraseña"
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-xs text-red-300">
                      {formErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-3">
                {hasPassword && (
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className="text-text-muted">Fortaleza de contraseña:</span>
                    <span className="capitalize text-text">{passwordStrength}</span>
                  </div>
                )}
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${!hasPassword
                      ? 'bg-transparent'
                      : passwordStrength === 'fuerte'
                        ? 'bg-emerald-500'
                        : passwordStrength === 'media'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                    style={{
                      width: !hasPassword
                        ? '0%'
                        : passwordStrength === 'fuerte'
                          ? '100%'
                          : passwordStrength === 'media'
                            ? '66%'
                            : '33%',
                    }}
                  />
                </div>
              </div>

              <div className="mb-3 rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-text mb-3">Preferencias literarias</p>
                {categoriesLoading ? (
                  <p className="text-xs text-text-muted">Cargando categorías...</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const categoryId = Number(category.categoryId);
                      const selected = Number.isFinite(categoryId) && formData.categoryIds.includes(categoryId);
                      return (
                        <button
                          key={categoryId}
                          type="button"
                          onClick={() => toggleCategory(categoryId)}
                          disabled={!Number.isFinite(categoryId)}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${selected
                            ? 'border-primary-500 bg-primary-500/20 text-primary-500'
                            : 'border-border text-text-muted hover:border-primary-400 hover:text-text'
                            }`}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {formErrors.categoryIds && <p className="text-xs text-red-300 mt-2">{formErrors.categoryIds}</p>}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="text-sm text-red-300 mt-4">{errorMessage}</div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="text-sm text-emerald-300 mt-4">
                  {successMessage}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="100%"
                loading={loading}
                className="mt-6"
              >
                Crear cuenta
              </Button>
            </form>

            <p className="mt-6 text-sm text-text-muted text-center">
              ¿Ya tienes cuenta?{' '}
              <Link
                to="/login"
                state={authOriginState}
                className="text-sm text-primary-500 hover:text-primary-600 transition-colors font-medium"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
