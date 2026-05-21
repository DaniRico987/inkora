import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../Components/AdminLayout';
import {
  DataTable,
  type DataTableColumn,
  type DataTableAction,
} from '../Components/DataTable';
import { FormModal } from '../Components/FormModal';
import { ConfirmationModal } from '../Components/ConfirmationModal';
import { DataTable, type DataTableAction, type DataTableColumn } from '../Components/DataTable';
import { FormModal } from '../Components/FormModal';
import { Spinner } from '../Components/Spinner';
import { StoreMapPicker } from '../Components/StoreMapPicker';
import { useSnackbar } from '../Components/SnackbarProvider';
import { getAccessToken, getRoleFromToken } from '../auth/session';
import {
  createStore,
  deleteStore,
  getStoreInventory,
  getStoreOrders,
  getStores,
  updateStore,
  type StoreInventoryResponse,
  type StoreOrdersResponse,
  type StoreRecord,
} from '../api/stores';
import type { CreateStoreRequest } from '../interfaces/admin';

type StoreFormValues = {
  name: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
  capacity: string;
  status: 'active' | 'inactive';
};

const INITIAL_FORM_VALUES: StoreFormValues = {
  name: '',
  address: '',
  city: '',
  latitude: '',
  longitude: '',
  capacity: '',
  status: 'active',
};

const ACTIVE_ORDER_STATUSES = new Set(['inPreparation', 'shipped']);

const STORE_STATUS_LABELS: Record<'active' | 'inactive', string> = {
  active: 'Activa',
  inactive: 'Inactiva',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  inPreparation: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

function formatCoordinates(latitude: number | null, longitude: number | null) {
  if (latitude == null || longitude == null) {
    return 'Sin coordenadas';
  }

  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function formatMoney(value: number) {
  return value.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Date(value).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getStoreStatusClass(status: 'active' | 'inactive') {
  return status === 'active'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';
}

function getOrderStatusClass(status: string) {
  if (status === 'delivered') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (status === 'cancelled') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (status === 'shipped') {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }

  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function normalizeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateForm(values: StoreFormValues) {
  const name = values.name.trim();
  const address = values.address.trim();
  const city = values.city.trim();
  const latitude = normalizeNumber(values.latitude);
  const longitude = normalizeNumber(values.longitude);
  const capacity = normalizeNumber(values.capacity);

  if (!name) {
    return 'El nombre de la tienda es obligatorio.';
  }

  if (!address) {
    return 'La dirección es obligatoria.';
  }

  if (!city) {
    return 'La ciudad es obligatoria.';
  }

  if (latitude == null || longitude == null) {
    return 'Debes indicar las coordenadas de la tienda.';
  }

  if (latitude < -90 || latitude > 90) {
    return 'La latitud debe estar entre -90 y 90.';
  }

  if (longitude < -180 || longitude > 180) {
    return 'La longitud debe estar entre -180 y 180.';
  }

  if (capacity == null || capacity <= 0 || !Number.isInteger(capacity)) {
    return 'La capacidad debe ser un número entero mayor a cero.';
  }

  return null;
}

function toFormValues(store: StoreRecord): StoreFormValues {
  return {
    name: store.name,
    address: store.address,
    city: store.city,
    latitude: store.latitude != null ? String(store.latitude) : '',
    longitude: store.longitude != null ? String(store.longitude) : '',
    capacity: store.capacity != null ? String(store.capacity) : '',
    status: store.status,
  };
}

type SummaryCardProps = {
  label: string;
  value: string | number;
  helper?: string;
};

function SummaryCard({ label, value, helper }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-bg-secondary px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
      {helper ? <p className="mt-1 text-sm text-text-muted">{helper}</p> : null}
    </div>
  );
}

export function StoresManagementPage() {
  const navigate = useNavigate();
  const token = getAccessToken();
  const role = getRoleFromToken(token);
  const queryClient = useQueryClient();
  const { success, error: showError } = useSnackbar();

  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreRecord | null>(null);
  const [formValues, setFormValues] = useState<StoreFormValues>(INITIAL_FORM_VALUES);
  const [formError, setFormError] = useState<string | null>(null);

  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryData, setInventoryData] = useState<StoreInventoryResponse | null>(null);

  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersData, setOrdersData] = useState<StoreOrdersResponse | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<StoreRecord | null>(null);
  const [deleteBlocked, setDeleteBlocked] = useState<{
    store: StoreRecord;
    pendingOrders: number;
  } | null>(null);
  const [deleteCheckLoading, setDeleteCheckLoading] = useState(false);

  const storesQuery = useQuery({
    queryKey: ['admin-stores'],
    queryFn: getStores,
    enabled: role !== 'root',
  });

  const saveStoreMutation = useMutation({
    mutationFn: async (payload: { storeId?: number; data: CreateStoreRequest }) => {
      if (payload.storeId != null) {
        return updateStore(payload.storeId, payload.data);
      }

      return createStore(payload.data);
    },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: deleteStore,
  });

  useEffect(() => {
    if (role === 'root') {
      navigate('/admin/create-admin', { replace: true });
    }
  }, [navigate, role]);

  const stores = storesQuery.data ?? [];

  const filteredStores = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      setCurrentPage(1);
      return;
    }

    try {
      setIsLoading(true);
      // El endpoint /stores/search no existe en backend actual, filtramos localmente
      const data = await getStores();
      const filtered = (Array.isArray(data) ? data : []).filter(
        (store: Store) =>
          store.name.toLowerCase().includes(query.toLowerCase()) ||
          store.address.toLowerCase().includes(query.toLowerCase()) ||
          store.city.toLowerCase().includes(query.toLowerCase()),
      );
      setStores(filtered);
      setTotalPages(1);
      setCurrentPage(1);
    } catch (err) {
      error('Error en la búsqueda');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openInventoryModal = async (store: StoreRecord) => {
    setInventoryData(null);
    setInventoryLoading(true);
    setInventoryModalOpen(true);

    try {
      const data = await fetchStoreInventory(store.storeId);
      setInventoryData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el inventario de la tienda';
      showError(message);
      setInventoryModalOpen(false);
    } finally {
      setInventoryLoading(false);
    }
  };

  const openOrdersModal = async (store: StoreRecord) => {
    setOrdersData(null);
    setOrdersLoading(true);
    setOrdersModalOpen(true);

    try {
      const data = await fetchStoreOrders(store.storeId);
      setOrdersData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los pedidos de la tienda';
      showError(message);
      setOrdersModalOpen(false);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleDeleteClick = async (store: StoreRecord) => {
    setDeleteCheckLoading(true);

    try {
      const data = await fetchStoreOrders(store.storeId);
      setOrdersData(data);

      if (data.pendingOrders > 0) {
        setDeleteBlocked({ store, pendingOrders: data.pendingOrders });
        return;
      }

      setDeleteTarget(store);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo validar si la tienda puede eliminarse';
      showError(message);
    } finally {
      setDeleteCheckLoading(false);
    }
  };

  const handleSaveStore = async () => {
    const validationMessage = validateForm(formValues);

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    const payload: CreateStoreRequest = {
      name: formValues.name.trim(),
      address: formValues.address.trim(),
      city: formValues.city.trim(),
      latitude: Number(formValues.latitude),
      longitude: Number(formValues.longitude),
      capacity: Number(formValues.capacity),
      status: formValues.status,
    };

    setFormError(null);

    try {
      await saveStoreMutation.mutateAsync({
        storeId: editingStore?.storeId,
        data: payload,
      });

      await queryClient.invalidateQueries({ queryKey: ['admin-stores'] });

      success(editingStore ? 'Tienda actualizada' : 'Tienda creada');
      closeFormModal();
    } catch (err) {
      error('Error al eliminar tienda');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const roundTo7Decimals = (num: number): number => {
    return Math.round(num * 10000000) / 10000000;
  };

  const handleFormSubmit = async (formData: FormData) => {
    try {
      setIsLoading(true);
      const latitudeValue = formData.get('latitude') as string;
      const longitudeValue = formData.get('longitude') as string;
      const capacityValue = formData.get('capacity') as string;
      const locationValue = extractCityName(
        (formData.get('city') as string) || '',
      );

      const data = {
        name: (formData.get('name') as string) || '',
        address: (formData.get('address') as string) || '',
        city: locationValue,
        latitude: latitudeValue.trim() ? roundTo7Decimals(Number(latitudeValue)) : undefined,
        longitude: longitudeValue.trim() ? roundTo7Decimals(Number(longitudeValue)) : undefined,
        capacity: capacityValue ? parseInt(capacityValue, 10) : undefined,
        status: formData.get('status') as string as
          | 'active'
          | 'inactive'
          | undefined,
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

      console.log('Sending store data:', data);

      if (editingStore) {
        await updateStore(editingStore.storeId, data);
        success('Tienda actualizada exitosamente');
      } else {
        await createStore(data);
        success('Tienda creada exitosamente');
        window.location.reload();
      }

      setIsFormOpen(false);
      setCurrentPage(1);
      setStoreForm(initialStoreForm);
      setEditingStore(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la tienda';
      showError(message);
    }
  };

  if (role === 'root') {
    return <Navigate to="/admin/create-admin" replace />;
  }

  const columns: DataTableColumn<StoreRecord>[] = [
    {
      key: 'storeId',
      label: 'ID',
      width: '88px',
    },
    {
      key: 'name',
      label: 'Tienda',
      width: '240px',
      render: (_, store) => (
        <div className="space-y-1">
          <p className="font-semibold text-text">{store.name}</p>
          <p className="text-xs text-text-muted">{store.city}</p>
        </div>
      ),
    },
    {
      key: 'address',
      label: 'Dirección',
      width: '260px',
    },
    {
      key: 'city',
      label: 'Ciudad',
      width: '170px',
    },
    {
      key: 'latitude',
      label: 'Coordenadas',
      width: '180px',
      render: (_, store) => <span>{formatCoordinates(store.latitude, store.longitude)}</span>,
    },
    {
      key: 'capacity',
      label: 'Capacidad',
      width: '15%',
      render: (value) =>
        value !== undefined && value !== null ? String(value) : 'N/A',
    },
    {
      key: 'status',
      label: 'Estado',
      width: '130px',
      render: (_, store) => (
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStoreStatusClass(store.status)}`}
        >
          {STORE_STATUS_LABELS[store.status]}
        </span>
      ),
    },
  ];

  const actions: DataTableAction<StoreRecord>[] = [
    {
      label: 'Inventario',
      variant: 'secondary',
      onClick: (store) => {
        void openInventoryModal(store);
      },
    },
    {
      label: 'Pedidos activos',
      variant: 'secondary',
      onClick: (store) => {
        void openOrdersModal(store);
      },
    },
    {
      label: 'Editar',
      variant: 'primary',
      onClick: openEditModal,
    },
    {
      label: 'Eliminar',
      variant: 'destructive',
      onClick: (store) => {
        void handleDeleteClick(store);
      },
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-bg-secondary p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-muted">
              Administración
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-text">Tiendas físicas</h1>
            <p className="max-w-3xl text-sm text-text-muted">
              Gestiona la red de tiendas, consulta inventario y pedidos activos, y mantiene las
              ubicaciones listas para la operación diaria.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600"
          >
            Nueva tienda
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Tiendas totales" value={totalStores} helper="Registradas en el sistema" />
          <SummaryCard label="Tiendas activas" value={activeStores} helper="Disponibles para operación" />
          <SummaryCard
            label="Con coordenadas"
            value={storesWithCoordinates}
            helper="Ubicaciones listas para mapa y georreferenciación"
          />
        </div>

        {storesQuery.error ? (
          <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {storesQuery.error instanceof Error
              ? storesQuery.error.message
              : 'No se pudieron cargar las tiendas'}
          </div>
        ) : null}

        {deleteCheckLoading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-bg-secondary px-4 py-3 text-sm text-text-muted">
            <Spinner />
            Verificando si la tienda puede eliminarse...
          </div>
        ) : null}

        <DataTable
          columns={columns}
          data={filteredStores}
          actions={actions}
          isLoading={storesQuery.isLoading}
          onSearch={setSearch}
          searchPlaceholder="Buscar por nombre, ciudad o dirección"
          emptyMessage={
            search.trim()
              ? 'No hay tiendas que coincidan con la búsqueda.'
              : 'No hay tiendas registradas todavía.'
          }
        />
      </div>

      <FormModal
        isOpen={isFormOpen}
        title={editingStore ? 'Editar tienda' : 'Nueva tienda'}
        onClose={closeFormModal}
        onSubmit={async () => {
          await handleSaveStore();
        }}
        isLoading={saveStoreMutation.isPending}
        submitText={editingStore ? 'Guardar cambios' : 'Crear tienda'}
        size="lg"
      >
        <div className="space-y-4">
          {formError ? (
            <div className="rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              {formError}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-text">
              <span>Nombre</span>
              <input
                type="text"
                value={formValues.name}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-text outline-none transition focus:border-primary-400"
                placeholder="Sucursal Centro"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-text">
              <span>Ciudad</span>
              <input
                type="text"
                value={formValues.city}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, city: event.target.value }))
                }
                className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-text outline-none transition focus:border-primary-400"
                placeholder="Pereira"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm font-medium text-text">
            <span>Dirección</span>
            <input
              type="text"
              name="address"
              required
              value={storeForm.address}
              placeholder="Dirección completa"
              onChange={(event) => {
                const nextValue = normalizeStoreAddress(event.currentTarget.value);
                event.currentTarget.value = nextValue;
                setStoreForm((prev) => ({ ...prev, address: nextValue }));
              }}
              title="Solo letras, números, espacios y signos de dirección básicos"
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          {/*<div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Latitud (opcional)
              </label>
              <input
                type="number"
                name="latitude"
                step="0.000001"
                value={storeForm.latitude}
                onChange={(event) => setStoreForm((prev) => ({ ...prev, latitude: event.target.value }))}
                placeholder="-33.4489"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Longitud (opcional)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={formValues.capacity}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, capacity: event.target.value }))
                }
                className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-text outline-none transition focus:border-primary-400"
                placeholder="120"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm font-medium text-text">
            <span>Estado</span>
            <select
              value={formValues.status}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  status: event.target.value === 'inactive' ? 'inactive' : 'active',
                }))
              }
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-text outline-none transition focus:border-primary-400"
            >
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </label>

          <StoreMapPicker
            address={formValues.address}
            city={formValues.city}
            latitude={formValues.latitude ? Number(formValues.latitude) : null}
            longitude={formValues.longitude ? Number(formValues.longitude) : null}
            onCoordinatesChange={(coordinates) => {
              setFormValues((current) => ({
                ...current,
                latitude: coordinates ? String(coordinates.latitude) : '',
                longitude: coordinates ? String(coordinates.longitude) : '',
              }));
            }}
          />

          <input type="hidden" name="latitude" value={storeForm.latitude} />
          <input type="hidden" name="longitude" value={storeForm.longitude} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Capacidad (opcional)
              </label>
              <input
                type="number"
                name="capacity"
                min="0"
                value={storeForm.capacity}
                onChange={(event) => setStoreForm((prev) => ({ ...prev, capacity: event.target.value }))}
                placeholder="100"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Estado
              </label>
              <select
                name="status"
                required
                value={storeForm.status}
                onChange={(event) => setStoreForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))}
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text focus:outline-none focus:border-border-focus transition-colors"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </FormModal>

      <FormModal
        isOpen={inventoryModalOpen}
        title={inventoryData ? `Inventario de ${inventoryData.store.name}` : 'Inventario de tienda'}
        onClose={() => setInventoryModalOpen(false)}
        onSubmit={async () => {
          setInventoryModalOpen(false);
        }}
        isLoading={inventoryLoading && inventoryData == null}
        submitText="Cerrar"
        size="lg"
      >
        {inventoryData ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                label="Disponibles"
                value={inventoryData.totalAvailableQuantity}
                helper="Unidades listas para vender"
              />
              <SummaryCard
                label="Reservados"
                value={inventoryData.totalReservedQuantity}
                helper="Unidades apartadas en pedidos"
              />
              <SummaryCard
                label="Ítems"
                value={inventoryData.items.length}
                helper="Libros con inventario registrado"
              />
            </div>

            <div className="rounded-2xl border border-border bg-bg-secondary overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-bg">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text">Libro</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text">Autor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text">Disponible</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text">Reservado</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {inventoryData.items.map((item) => (
                    <tr key={item.bookId} className="hover:bg-bg">
                      <td className="px-4 py-3 text-sm text-text">{item.title}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">{item.author}</td>
                      <td className="px-4 py-3 text-sm text-text">{item.availableQuantity}</td>
                      <td className="px-4 py-3 text-sm text-text">{item.reservedQuantity}</td>
                      <td className="px-4 py-3 text-sm text-text">{item.totalQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {inventoryData.items.length === 0 ? (
              <p className="text-sm text-text-muted">No hay inventario registrado para esta tienda.</p>
            ) : null}
          </div>
        ) : inventoryLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : null}
      </FormModal>

      <FormModal
        isOpen={ordersModalOpen}
        title={ordersData ? `Pedidos activos de ${ordersData.store.name}` : 'Pedidos activos de tienda'}
        onClose={() => setOrdersModalOpen(false)}
        onSubmit={async () => {
          setOrdersModalOpen(false);
        }}
        isLoading={ordersLoading && ordersData == null}
        submitText="Cerrar"
        size="lg"
      >
        {ordersData ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                label="Activos"
                value={inventoryActiveOrders.length}
                helper="Pedidos en preparación o en despacho"
              />
              <SummaryCard
                label="Totales"
                value={ordersData.totalOrders}
                helper="Pedidos consultados para esta tienda"
              />
              <SummaryCard
                label="Pendientes"
                value={ordersData.pendingOrders}
                helper="Bloquean la eliminación de la tienda"
              />
            </div>

            <div className="rounded-2xl border border-border bg-bg-secondary overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-bg">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text">Pedido</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text">Cliente</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text">Fecha</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text">Estado</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text">Total</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text">Artículos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {inventoryActiveOrders.map((order) => {
                    const clientName = `${order.client.firstName} ${order.client.lastName}`.trim();

                    return (
                      <tr key={order.purchaseId} className="hover:bg-bg">
                        <td className="px-4 py-3 text-sm font-medium text-text">#{order.purchaseId}</td>
                        <td className="px-4 py-3 text-sm text-text-muted">{clientName || order.client.email}</td>
                        <td className="px-4 py-3 text-sm text-text-muted">{formatDate(order.purchaseDate)}</td>
                        <td className="px-4 py-3 text-sm text-text">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getOrderStatusClass(order.status)}`}
                          >
                            {ORDER_STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-text">{formatMoney(order.totalAmount)}</td>
                        <td className="px-4 py-3 text-sm text-text">{order.items.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {inventoryActiveOrders.length === 0 ? (
              <p className="text-sm text-text-muted">No hay pedidos activos para esta tienda.</p>
            ) : null}
          </div>
        ) : ordersLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : null}
      </FormModal>

      <ConfirmationModal
        isOpen={deleteBlocked != null}
        title="Eliminación no permitida"
        message={
          deleteBlocked
            ? `No puedes eliminar ${deleteBlocked.store.name} porque tiene ${deleteBlocked.pendingOrders} pedido(s) pendiente(s) en preparación o despacho.`
            : ''
        }
        cancelText="Cerrar"
        confirmText="Ver pedidos activos"
        onCancel={() => setDeleteBlocked(null)}
        onConfirm={async () => {
          if (!deleteBlocked) {
            return;
          }

          const store = deleteBlocked.store;
          setDeleteBlocked(null);
          await openOrdersModal(store);
        }}
      />

      <ConfirmationModal
        isOpen={deleteTarget != null}
        title="Eliminar tienda"
        message={
          deleteTarget
            ? `¿Seguro que deseas eliminar ${deleteTarget.name}? Esta acción no se puede deshacer.`
            : ''
        }
        cancelText="Cancelar"
        confirmText="Eliminar"
        isConfirmLoading={deleteStoreMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </AdminLayout>
  );
}