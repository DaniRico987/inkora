import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../Components/AdminLayout';
import { getAdminStats } from '../api/admin';
import { getRoleFromToken, getAccessToken } from '../auth/session';
import { Spinner } from '../Components/Spinner';
import { Link } from 'react-router-dom';
import { FormModal } from '../Components/FormModal';
import { LocationPicker } from '../Components/LocationPicker';
import { useSnackbar } from '../Components/SnackbarProvider';
import { createBook } from '../api/books';
import { createStore } from '../api/stores';
import type { AdminStats } from '../interfaces/admin';

const BOOK_LANGUAGE_OPTIONS = [
  { label: 'Inglés', value: 'Inglés' },
  { label: 'Español', value: 'Español' },
  { label: 'Portugués', value: 'Portugués' },
  { label: 'Francés', value: 'Francés' },
  { label: 'Alemán', value: 'Alemán' },
  { label: 'Italiano', value: 'Italiano' },
  { label: 'Neerlandés', value: 'Neerlandés' },
  { label: 'Sueco', value: 'Sueco' },
  { label: 'Polaco', value: 'Polaco' },
  { label: 'Griego', value: 'Griego' },
  { label: 'Chino', value: 'Chino' },
  { label: 'Japonés', value: 'Japonés' },
  { label: 'Ruso', value: 'Ruso' },
];

const CURRENT_YEAR = new Date().getFullYear();

const normalizeBookText = (value: string) =>
  value
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/^\s+/, '');

const normalizeStoreName = (value: string) => normalizeBookText(value);

const normalizeStoreAddress = (value: string) =>
  value
    .replace(/[^\p{L}\p{N}\s#.,\-/]/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/^\s+/, '');

const extractCityName = (value: string) => value.split(',')[0]?.trim() || '';

const normalizeIsbnValue = (value: string) => value.replace(/\D/g, '');

const normalizeLanguageValue = (value: string) => {
  const normalized = value.trim();
  if (normalized === 'Ingles') return 'Inglés';
  if (normalized === 'Espanol') return 'Español';
  if (normalized === 'Portugues') return 'Portugués';
  if (normalized === 'Frances') return 'Francés';
  if (normalized === 'Aleman') return 'Alemán';
  if (normalized === 'Neerlandes') return 'Neerlandés';
  if (normalized === 'Japones') return 'Japonés';
  return normalized;
};
export function AdminDashboard() {
  const navigate = useNavigate();
  const token = getAccessToken();
  const role = getRoleFromToken(token);
  const { success, error } = useSnackbar();
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isFormOpenBooks, setIsFormOpenBooks] = useState(false);
  const [isFormOpenStores, setIsFormOpenStores] = useState(false);
  const [storeLocation, setStoreLocation] = useState('');
  const [inventoryQuantity, setInventoryQuantity] = useState<number>(1);

  // Redirect root users
  useEffect(() => {
    if (role === 'root') {
      navigate('/admin/create-admin', { replace: true });
    }
  }, [role, navigate]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const data = await getAdminStats();
        setStats(data);
        setDashboardError(null);
      } catch (err) {
        setDashboardError('Error al cargar estadísticas');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleFormSubmitBook = async (formData: FormData) => {
    try {
      setIsLoading(true);
      const publicationYearValue = formData.get('publicationYear') as string;
      const pageCountValue = formData.get('pageCount') as string;
      const priceValue = formData.get('price') as string;

      const data = {
        title: (formData.get('title') as string) || '',
        author: (formData.get('author') as string) || '',
        publicationYear: publicationYearValue
          ? parseInt(publicationYearValue, 10)
          : undefined,
        publisher: (formData.get('publisher') as string) || undefined,
        isbn: (formData.get('isbn') as string) || undefined,
        language: (formData.get('language') as string) || undefined,
        pageCount: pageCountValue ? parseInt(pageCountValue, 10) : undefined,
        price: priceValue ? parseFloat(priceValue) : 0,
        condition: (formData.get('condition') as string) as 'new' | 'used' | undefined,
        isAvailable: (formData.get('isAvailable') as string) === 'on',
        description: (formData.get('description') as string) || undefined,
        coverUrl: (formData.get('coverUrl') as string) || undefined,
        previewUrl: (formData.get('previewUrl') as string) || undefined,
        categoryIds: [],
        initialInventoryQuantity: inventoryQuantity,
      };

      const isbnValue = normalizeIsbnValue((formData.get('isbn') as string) || '');
      const descriptionValue = ((formData.get('description') as string) || '').trim();

      if (inventoryQuantity < 1) {
        throw new Error('La cantidad de inventario inicial debe ser mayor a 0');
      }
      if (!descriptionValue) {
        throw new Error('La descripción es obligatoria');
      }
      if (isbnValue.length !== 13) {
        throw new Error('El ISBN debe tener exactamente 13 dígitos');
      }
      data.isbn = isbnValue;
      data.description = descriptionValue;
      await createBook(data);
      success('Libro creado exitosamente');
      setIsFormOpenBooks(false);
      setInventoryQuantity(1);
      window.location.reload();
    } catch (err) {
      error('Error al guardar libro');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmitStore = async (formData: FormData) => {
    try {
      setIsLoading(true);
      const latitudeValue = formData.get('latitude') as string;
      const longitudeValue = formData.get('longitude') as string;
      const capacityValue = formData.get('capacity') as string;
      const locationValue = extractCityName((formData.get('city') as string) || '');

      const data = {
        name: (formData.get('name') as string) || '',
        address: (formData.get('address') as string) || '',
        city: locationValue,
        latitude: latitudeValue ? parseFloat(latitudeValue) : undefined,
        longitude: longitudeValue ? parseFloat(longitudeValue) : undefined,
        capacity: capacityValue ? parseInt(capacityValue, 10) : undefined,
        status: (formData.get('status') as string) as 'active' | 'inactive' | undefined,
      };

      const nameValue = ((formData.get('name') as string) || '').trim();
      const addressValue = ((formData.get('address') as string) || '').trim();

      if (!nameValue) {
        throw new Error('El nombre de la tienda es obligatorio');
      }
      if (!addressValue) {
        throw new Error('La dirección es obligatoria');
      }
      if (!locationValue) {
        throw new Error('Debes seleccionar un lugar');
      }

      data.name = normalizeStoreName(nameValue);
      data.address = normalizeStoreAddress(addressValue);
      await createStore(data);
      success('Tienda creada exitosamente');
      setIsFormOpenStores(false);
      setStoreLocation('');
    } catch (err) {
      error('Error al guardar tienda');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Dashboard</h1>
          <p className="text-text-muted mt-2">
            Bienvenido al panel de administración de Inkora
          </p>
        </div>

        {dashboardError && (
          <div className="bg-red-600/20 border border-red-600 text-red-600 px-4 py-3 rounded-lg">
            {dashboardError}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner />
          </div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Books */}
              <div className="rounded-2xl border border-border bg-bg-secondary p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm font-medium">
                      Total Libros
                    </p>
                    <p className="text-3xl font-bold text-primary-500 mt-2">
                      {stats.totalBooks}
                    </p>
                  </div>
                  <span className="text-4xl">📚</span>
                </div>
                <Link to="/admin/books">
                  <button className="mt-4 text-sm text-primary-500 hover:text-primary-600 font-medium">
                    Ver todos →
                  </button>
                </Link>
              </div>

              {/* Total Stores */}
              <div className="rounded-2xl border border-border bg-bg-secondary p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm font-medium">
                      Total Tiendas
                    </p>
                    <p className="text-3xl font-bold text-primary-500 mt-2">
                      {stats.totalStores}
                    </p>
                  </div>
                  <span className="text-4xl">🏪</span>
                </div>
                <Link to="/admin/stores">
                  <button className="mt-4 text-sm text-primary-500 hover:text-primary-600 font-medium">
                    Ver todos →
                  </button>
                </Link>
              </div>

              {/* Total Admins */}
              <div className="rounded-2xl border border-border bg-bg-secondary p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm font-medium">
                      Total Administradores
                    </p>
                    <p className="text-3xl font-bold text-primary-500 mt-2">
                      {stats.totalAdmins}
                    </p>
                  </div>
                  <span className="text-4xl">👥</span>
                </div>
                <Link to="/admin/admins">
                  <button className="mt-4 text-sm text-primary-500 hover:text-primary-600 font-medium">
                    Ver todos →
                  </button>
                </Link>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border bg-bg-secondary p-6">
                <h3 className="text-lg font-semibold text-text mb-4">
                  Acciones Rápidas
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setIsFormOpenBooks(true)}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-border transition-colors text-text"
                  >
                    ➕ Crear nuevo libro
                  </button>
                  <button
                    onClick={() => setIsFormOpenStores(true)}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-border transition-colors text-text"
                  >
                    ➕ Crear nueva tienda
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-bg-secondary p-6">
                <h3 className="text-lg font-semibold text-text mb-4">
                  Información
                </h3>
                <p className="text-text-muted text-sm">
                  Panel administrativo completo para gestionar libros, tiendas y
                  administradores del sistema Inkora.
                </p>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Book Creation Modal */}
      <FormModal
        isOpen={isFormOpenBooks}
        title="Crear Libro"
        onClose={() => {
          setIsFormOpenBooks(false);
          setInventoryQuantity(1);
        }}
        onSubmit={handleFormSubmitBook}
        isLoading={isLoading}
        submitText="Crear"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Título</label>
            <input
              type="text"
              name="title"
              required
              placeholder="Nombre del libro"
              onInput={(event) => {
                event.currentTarget.value = normalizeBookText(event.currentTarget.value);
              }}
              title="Solo letras, números y espacios"
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Autor</label>
            <input
              type="text"
              name="author"
              required
              placeholder="Nombre del autor"
              onInput={(event) => {
                event.currentTarget.value = normalizeBookText(event.currentTarget.value);
              }}
              title="Solo letras, números y espacios"
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Precio</label>
              <input
                type="number"
                name="price"
                required
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Condición</label>
              <select
                name="condition"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text focus:outline-none focus:border-border-focus transition-colors"
              >
                <option value="">Seleccionar...</option>
                <option value="new">Nuevo</option>
                <option value="used">Usado</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isAvailable"
              id="isAvailable"
              className="rounded border border-border bg-bg"
            />
            <label htmlFor="isAvailable" className="text-sm font-medium text-text">
              Disponible
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Año de publicación</label>
              <input
                type="number"
                name="publicationYear"
                min="1000"
                max="2100"
                placeholder="e.g. 2023"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">ISBN</label>
              <input
                type="text"
                name="isbn"
                placeholder="ISBN"
                required
                inputMode="numeric"
                maxLength={13}
                minLength={13}
                pattern="[0-9]{13}"
                onInput={(event) => {
                  event.currentTarget.value = normalizeIsbnValue(event.currentTarget.value).slice(0, 13);
                }}
                title="Debe tener exactamente 13 dígitos"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Editorial</label>
              <input
                type="text"
                name="publisher"
                placeholder="Editorial"
                onInput={(event) => {
                  event.currentTarget.value = normalizeBookText(event.currentTarget.value);
                }}
                title="Solo letras, números y espacios"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Idioma</label>
              <select
                name="language"
                required
                defaultValue=""
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              >
                <option value="" disabled>
                  Seleccionar idioma
                </option>
                {BOOK_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Páginas</label>
            <input
              type="number"
              name="pageCount"
              min="1"
              placeholder="300"
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">URL de portada</label>
            <input
              type="url"
              name="coverUrl"
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">URL de vista previa</label>
            <input
              type="url"
              name="previewUrl"
              placeholder="https://..."
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Descripción</label>
            <textarea
              name="description"
              placeholder="Descripción del libro..."
              rows={4}
              required
              title="La descripción es obligatoria"
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Cantidad de inventario inicial</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInventoryQuantity(prev => Math.max(1, prev - 1))}
                className="px-3 py-2 rounded-lg border border-border bg-bg text-text hover:bg-border-hover transition-colors"
              >
                −
              </button>
              <span className="w-12 text-center text-text font-medium">
                {inventoryQuantity}
              </span>
              <button
                type="button"
                onClick={() => setInventoryQuantity(prev => prev + 1)}
                className="px-3 py-2 rounded-lg border border-border bg-bg text-text hover:bg-border-hover transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </FormModal>

      {/* Store Creation Modal */}
      <FormModal
        isOpen={isFormOpenStores}
        title="Crear Tienda"
        onClose={() => {
          setIsFormOpenStores(false);
          setStoreLocation('');
        }}
        onSubmit={handleFormSubmitStore}
        isLoading={isLoading}
        submitText="Crear"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Nombre de la Tienda</label>
            <input
              type="text"
              name="name"
              required
              placeholder="Nombre de la tienda"
              onInput={(event) => {
                event.currentTarget.value = normalizeStoreName(event.currentTarget.value);
              }}
              title="Solo letras, números y espacios"
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Dirección</label>
            <input
              type="text"
              name="address"
              required
              placeholder="Dirección completa"
              onInput={(event) => {
                event.currentTarget.value = normalizeStoreAddress(event.currentTarget.value);
              }}
              title="Solo letras, números, espacios y signos de dirección básicos"
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div>
            <LocationPicker
              label="Lugar"
              value={storeLocation}
              onChange={(value) => setStoreLocation(extractCityName(value))}
            />
            <input type="hidden" name="city" value={storeLocation} readOnly />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Latitud (opcional)</label>
              <input
                type="number"
                name="latitude"
                step="0.000001"
                placeholder="-33.4489"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Longitud (opcional)</label>
              <input
                type="number"
                name="longitude"
                step="0.000001"
                placeholder="-70.6693"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Capacidad (opcional)</label>
              <input
                type="number"
                name="capacity"
                min="0"
                placeholder="100"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Estado</label>
              <select
                name="status"
                required
                defaultValue="active"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text focus:outline-none focus:border-border-focus transition-colors"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </FormModal>
    </AdminLayout>
  );
}
