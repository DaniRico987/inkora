import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../Components/AdminLayout';
import {
    DataTable,
    type DataTableAction,
    type DataTableColumn,
} from '../Components/DataTable';
import { ConfirmationModal } from '../Components/ConfirmationModal';
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
    updateStoreInventory,
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

type InventoryDraft = Record<number, string>;

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
    const [inventoryDraft, setInventoryDraft] = useState<InventoryDraft>({});
    const [inventorySaving, setInventorySaving] = useState(false);

    const [ordersModalOpen, setOrdersModalOpen] = useState(false);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersData, setOrdersData] = useState<StoreOrdersResponse | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<StoreRecord | null>(null);
    const [deleteBlocked, setDeleteBlocked] = useState<{ store: StoreRecord; pendingOrders: number } | null>(null);
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
            return stores;
        }

        return stores.filter(
            (store) =>
                store.name.toLowerCase().includes(query) ||
                store.address.toLowerCase().includes(query) ||
                store.city.toLowerCase().includes(query),
        );
    }, [search, stores]);

    const totalStores = stores.length;
    const activeStores = stores.filter((store) => store.status === 'active').length;
    const storesWithCoordinates = stores.filter(
        (store) => store.latitude != null && store.longitude != null,
    ).length;

    const openCreateModal = () => {
        setEditingStore(null);
        setFormValues(INITIAL_FORM_VALUES);
        setFormError(null);
        setIsFormOpen(true);
    };

    const openEditModal = (store: StoreRecord) => {
        setEditingStore(store);
        setFormValues(toFormValues(store));
        setFormError(null);
        setIsFormOpen(true);
    };

    const closeFormModal = () => {
        setIsFormOpen(false);
        setEditingStore(null);
        setFormError(null);
        setFormValues(INITIAL_FORM_VALUES);
    };

    const closeInventoryModal = () => {
        setInventoryModalOpen(false);
        setInventoryData(null);
        setInventoryLoading(false);
        setInventoryDraft({});
        setInventorySaving(false);
    };

    const closeOrdersModal = () => {
        setOrdersModalOpen(false);
        setOrdersData(null);
        setOrdersLoading(false);
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
            latitude: normalizeNumber(formValues.latitude),
            longitude: normalizeNumber(formValues.longitude),
            capacity: normalizeNumber(formValues.capacity),
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
            const message = err instanceof Error ? err.message : 'No se pudo guardar la tienda';
            showError(message);
            console.error(err);
        }
    };

    const openInventoryModal = async (store: StoreRecord) => {
        setInventoryData(null);
        setInventoryDraft({});
        setInventoryLoading(true);
        setInventoryModalOpen(true);

        try {
            const data = await getStoreInventory(store.storeId);
            setInventoryData(data);
            setInventoryDraft(
                Object.fromEntries(
                    data.items.map((item) => [item.bookId, String(item.availableQuantity)]),
                ),
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : 'No se pudo cargar el inventario de la tienda';
            showError(message);
            closeInventoryModal();
        } finally {
            setInventoryLoading(false);
        }
    };

    const openOrdersModal = async (store: StoreRecord) => {
        setOrdersData(null);
        setOrdersLoading(true);
        setOrdersModalOpen(true);

        try {
            const data = await getStoreOrders(store.storeId);
            setOrdersData(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'No se pudieron cargar los pedidos de la tienda';
            showError(message);
            closeOrdersModal();
        } finally {
            setOrdersLoading(false);
        }
    };

    const handleDeleteClick = async (store: StoreRecord) => {
        setDeleteCheckLoading(true);

        try {
            const data = await getStoreOrders(store.storeId);

            if (data.pendingOrders > 0) {
                setDeleteBlocked({ store, pendingOrders: data.pendingOrders });
                return;
            }

            setDeleteTarget(store);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'No se pudo validar si la tienda puede eliminarse';
            showError(message);
            console.error(err);
        } finally {
            setDeleteCheckLoading(false);
        }
    };

    const handleSaveInventory = async () => {
        if (!inventoryData) {
            return;
        }

        const items = inventoryData.items.map((item) => {
            const rawValue = inventoryDraft[item.bookId] ?? String(item.availableQuantity);
            const parsedValue = Number(rawValue.trim());

            if (!Number.isFinite(parsedValue) || !Number.isInteger(parsedValue) || parsedValue < 0) {
                throw new Error(`La cantidad del libro ${item.title} debe ser un número entero mayor o igual a cero.`);
            }

            return {
                bookId: item.bookId,
                availableQuantity: parsedValue,
            };
        });

        try {
            setInventorySaving(true);
            const updated = await updateStoreInventory(inventoryData.store.storeId, items);
            setInventoryData(updated);
            setInventoryDraft(
                Object.fromEntries(
                    updated.items.map((item) => [item.bookId, String(item.availableQuantity)]),
                ),
            );
            await queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
            success('Inventario actualizado');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'No se pudo actualizar el inventario';
            showError(message);
            console.error(err);
        } finally {
            setInventorySaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) {
            return;
        }

        try {
            await deleteStoreMutation.mutateAsync(deleteTarget.storeId);
            await queryClient.invalidateQueries({ queryKey: ['admin-stores'] });
            success('Tienda eliminada');
            setDeleteTarget(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'No se pudo eliminar la tienda';
            showError(message);
            console.error(err);
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
            width: '120px',
            render: (value) => (value != null ? String(value) : 'N/A'),
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
                            value={formValues.address}
                            placeholder="Dirección completa"
                            onChange={(event) => {
                                setFormValues((current) => ({ ...current, address: event.target.value }));
                            }}
                            className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-text outline-none transition focus:border-primary-400"
                        />
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

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium text-text">
                            <span>Capacidad</span>
                            <input
                                type="number"
                                min="0"
                                value={formValues.capacity}
                                onChange={(event) =>
                                    setFormValues((current) => ({ ...current, capacity: event.target.value }))
                                }
                                className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-text outline-none transition focus:border-primary-400"
                                placeholder="120"
                            />
                        </label>

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
                    </div>
                </div>
            </FormModal>

            <FormModal
                isOpen={inventoryModalOpen}
                title={inventoryData ? `Inventario de ${inventoryData.store.name}` : 'Inventario de tienda'}
                onClose={closeInventoryModal}
                onSubmit={async () => {
                    await handleSaveInventory();
                }}
                isLoading={inventoryLoading && inventoryData == null || inventorySaving}
                submitText={inventoryData ? 'Guardar cambios' : 'Cerrar'}
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
                                label="Artículos"
                                value={inventoryData.items.length}
                                helper="Libros con inventario en esta tienda"
                            />
                        </div>

                        <p className="text-sm text-text-muted">
                            Ajusta la cantidad disponible por libro. Los reservados se mantienen intactos.
                        </p>

                        <div className="space-y-3">
                            {inventoryData.items.map((item) => (
                                <div
                                    key={item.bookId}
                                    className="rounded-2xl border border-border bg-bg px-4 py-3"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="font-semibold text-text">{item.title}</p>
                                            <p className="text-sm text-text-muted">{item.author}</p>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-3 sm:items-center">
                                            <label className="space-y-1 text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
                                                <span>Disponibles</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={inventoryDraft[item.bookId] ?? String(item.availableQuantity)}
                                                    onChange={(event) =>
                                                        setInventoryDraft((current) => ({
                                                            ...current,
                                                            [item.bookId]: event.target.value,
                                                        }))
                                                    }
                                                    className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm text-text outline-none transition focus:border-primary-400"
                                                />
                                            </label>
                                            <div className="text-sm text-text-muted">
                                                <p>Reservados</p>
                                                <p className="font-medium text-text">{item.reservedQuantity}</p>
                                            </div>
                                            <div className="text-sm text-text-muted">
                                                <p>Total</p>
                                                <p className="font-medium text-text">{item.totalQuantity}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </FormModal>

            <FormModal
                isOpen={ordersModalOpen}
                title={ordersData ? `Pedidos de ${ordersData.store.name}` : 'Pedidos activos'}
                onClose={closeOrdersModal}
                onSubmit={async () => {
                    closeOrdersModal();
                }}
                isLoading={ordersLoading && ordersData == null}
                submitText="Cerrar"
                size="lg"
            >
                {ordersData ? (
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <SummaryCard
                                label="Pedidos totales"
                                value={ordersData.totalOrders}
                                helper="Pedidos asociados a la tienda"
                            />
                            <SummaryCard
                                label="Pendientes"
                                value={ordersData.pendingOrders}
                                helper="Pedidos que aún no pueden cerrarse"
                            />
                            <SummaryCard
                                label="Mostrados"
                                value={ordersData.orders.length}
                                helper="Registros cargados desde el backend"
                            />
                        </div>

                        <div className="space-y-3">
                            {ordersData.orders.length > 0 ? (
                                ordersData.orders.map((order) => (
                                    <div
                                        key={order.purchaseId}
                                        className="rounded-2xl border border-border bg-bg px-4 py-3"
                                    >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="font-semibold text-text">Pedido #{order.purchaseId}</p>
                                                <p className="text-sm text-text-muted">
                                                    {order.client.firstName} {order.client.lastName} · {order.client.email}
                                                </p>
                                                <p className="text-xs text-text-muted">{formatDate(order.purchaseDate)}</p>
                                            </div>
                                            <div className="text-right">
                                                <span
                                                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getOrderStatusClass(order.status)}`}
                                                >
                                                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                                                </span>
                                                <p className="mt-2 text-sm font-semibold text-text">
                                                    {formatMoney(order.totalAmount)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 space-y-2">
                                            {order.items.map((item) => (
                                                <div
                                                    key={item.purchaseItemId}
                                                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-secondary px-3 py-2"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-text">{item.title}</p>
                                                        <p className="text-xs text-text-muted">{item.author}</p>
                                                    </div>
                                                    <div className="text-right text-xs text-text-muted">
                                                        <p>Cantidad: {item.quantity}</p>
                                                        <p>Subtotal: {formatMoney(item.subtotal)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="rounded-2xl border border-border bg-bg px-4 py-6 text-sm text-text-muted">
                                    No hay pedidos registrados para esta tienda.
                                </p>
                            )}
                        </div>
                    </div>
                ) : null}
            </FormModal>

            <ConfirmationModal
                isOpen={deleteBlocked != null}
                title="No se puede eliminar la tienda"
                message={
                    deleteBlocked
                        ? `La tienda ${deleteBlocked.store.name} tiene ${deleteBlocked.pendingOrders} pedido(s) pendiente(s). Debes resolverlos antes de eliminarla.`
                        : ''
                }
                confirmText="Entendido"
                cancelText="Cerrar"
                onConfirm={() => setDeleteBlocked(null)}
                onCancel={() => setDeleteBlocked(null)}
            />

            <ConfirmationModal
                isOpen={deleteTarget != null}
                title="Eliminar tienda"
                message={
                    deleteTarget
                        ? `¿Seguro que deseas eliminar la tienda ${deleteTarget.name}? Esta acción no se puede deshacer.`
                        : ''
                }
                confirmText="Eliminar"
                cancelText="Cancelar"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
                isConfirmLoading={deleteStoreMutation.isPending}
            />
        </AdminLayout>
    );
}
