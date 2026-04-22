import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../Components/AdminLayout';
import { Button } from '../Components/Button';
import { useSnackbar } from '../Components/SnackbarProvider';
import { LocationPicker } from '../Components/LocationPicker';
import { createAdmin } from '../api/admin';
import { getRoleFromToken, getAccessToken } from '../auth/session';
import type { CreateAdminRequest } from '../api/admin';

interface FormData {
  firstName: string;
  email: string;
}

interface FormErrors {
  [key: string]: string;
}

const initialFormData: FormData = {
  firstName: '',
  email: '',
};

export function RootAdminCreationPage() {
  const navigate = useNavigate();
  const { success, error } = useSnackbar();
  const token = getAccessToken();
  const currentUserRole = getRoleFromToken(token);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Only root can access this page
  const isRootOnly = currentUserRole !== 'root';

  // Validation
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.firstName.trim()) errors.firstName = 'Nombre es requerido';
    if (!formData.email.trim()) errors.email = 'Email es requerido';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email no es válido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setIsLoading(true);
      const adminData: CreateAdminRequest = {
        firstName: formData.firstName,
        email: formData.email,
      };

      await createAdmin(adminData);
      success(
        `Administrador ${formData.firstName} creado exitosamente. Se ha enviado una contraseña temporal al email.`
      );
      setFormData(initialFormData);
      setFormErrors({});
      // Redirect to admins management page
      navigate('/admin/admins');
    } catch (err: any) {
      console.error('Error creating admin:', err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo crear el administrador';
      error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isRootOnly) {
    navigate('/admin', { replace: true });
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text">Crear Administrador</h1>
          <p className="text-text-muted mt-2">
            Crea un nuevo administrador del sistema. Se enviará una contraseña temporal al email.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: DNI y Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DNI */}
              <div>
                <label
                  htmlFor="dni"
                  className="block text-sm font-medium text-text mb-2"
                >
                  DNI <span className="text-red-500">*</span>
                </label>
                <input
                  id="dni"
                  name="dni"
                  type="text"
                  value={formData.dni}
                  onChange={handleInputChange}
                  placeholder="Ej: 1098765432"
                  className={`w-full px-4 py-3 rounded-lg border ${formErrors.dni
                      ? 'border-red-500 bg-red-50 focus:bg-red-50'
                      : 'border-border bg-bg focus:bg-bg-secondary'
                    } text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`}
                  disabled={isLoading}
                />
                {formErrors.dni && (
                  <p className="mt-2 text-sm text-red-500">{formErrors.dni}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-text mb-2"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="admin@inkora.com"
                  className={`w-full px-4 py-3 rounded-lg border ${formErrors.email
                      ? 'border-red-500 bg-red-50 focus:bg-red-50'
                      : 'border-border bg-bg focus:bg-bg-secondary'
                    } text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`}
                  disabled={isLoading}
                />
                {formErrors.email && (
                  <p className="mt-2 text-sm text-red-500">{formErrors.email}</p>
                )}
              </div>
            </div>

            {/* Row 2: Nombre y Apellido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-text mb-2"
                >
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Ej: Ana"
                  className={`w-full px-4 py-3 rounded-lg border ${formErrors.firstName
                      ? 'border-red-500 bg-red-50 focus:bg-red-50'
                      : 'border-border bg-bg focus:bg-bg-secondary'
                    } text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`}
                  disabled={isLoading}
                />
                {formErrors.firstName && (
                  <p className="mt-2 text-sm text-red-500">
                    {formErrors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-text mb-2"
                >
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="admin@inkora.com"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    formErrors.email
                      ? 'border-red-500 bg-red-50 focus:bg-red-50'
                      : 'border-border bg-bg focus:bg-bg-secondary'
                    } text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`}
                  disabled={isLoading}
                />
                {formErrors.email && (
                  <p className="mt-2 text-sm text-red-500">{formErrors.email}</p>
                )}
              </div>
            </div>

            {/* Row 4: Género y Lugar de Nacimiento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gender */}
              <div>
                <label
                  htmlFor="gender"
                  className="block text-sm font-medium text-text mb-2"
                >
                  Género
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-bg focus:bg-bg-secondary text-text focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  disabled={isLoading}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              {/* Birth Place */}
              <div className="md:col-span-2">
                <LocationPicker
                  label="Lugar de Nacimiento"
                  value={formData.birthPlace || ''}
                  onChange={(birthPlace) =>
                    setFormData((prev) => ({
                      ...prev,
                      birthPlace,
                    }))
                  }
                  disabled={isLoading}
                  error={formErrors.birthPlace}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-text mb-2"
              >
                Dirección
              </label>
              <input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Ej: Calle 1 #2-3"
                className="w-full px-4 py-3 rounded-lg border border-border bg-bg focus:bg-bg-secondary text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                disabled={isLoading}
              />
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm text-text-muted">
                <span className="font-semibold text-blue-600">ℹ️ Nota:</span> Se
                generará una contraseña temporal que será enviada al email del nuevo
                administrador. El administrador deberá cambiarla en su primer inicio de
                sesión.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6 border-t border-border">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? 'Creando...' : 'Crear Administrador'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => navigate('/admin/admins')}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
