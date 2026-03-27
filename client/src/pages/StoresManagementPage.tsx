import { useState, useEffect } from 'react';
import { AdminLayout } from '../Components/AdminLayout';
import { DataTable, type DataTableColumn, type DataTableAction } from '../Components/DataTable';
import { FormModal } from '../Components/FormModal';
import { ConfirmationModal } from '../Components/ConfirmationModal';
import { useSnackbar } from '../Components/SnackbarProvider';
import {
  getStores,
  deleteStore,
  createStore,
  updateStore,
} from '../api/stores';
import type { Store } from '../interfaces/admin';

export function StoresManagementPage() {
  const { success, error } = useSnackbar();
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    storeId?: string;
  }>({ isOpen: false });

  // Fetch stores
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setIsLoading(true);
        const data = await getStores();
        setStores(Array.isArray(data) ? data : []);
        setTotalPages(1);
      } catch (err) {
        error('Error al cargar tiendas');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStores();
  }, [currentPage, error]);

  const handleSearch = async (query: string) => {
    if (!query) {
      setCurrentPage(1);
      return;
    }

    try {
      setIsLoading(true);
      // El endpoint /stores/search no existe en backend actual, filtramos localmente
      const data = await getStores();
      const filtered = (Array.isArray(data) ? data : []).filter((store: Store) =>
        store.name.toLowerCase().includes(query.toLowerCase()) ||
        store.address.toLowerCase().includes(query.toLowerCase()) ||
        store.city.toLowerCase().includes(query.toLowerCase())
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

  const handleAddStore = () => {
    setEditingStore(null);
    setIsFormOpen(true);
  };

  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (storeId: string) => {
    setDeleteConfirm({ isOpen: true, storeId });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.storeId) return;

    try {
      setIsLoading(true);
      await deleteStore(deleteConfirm.storeId);
      success('Tienda eliminada exitosamente');
      setCurrentPage(1);
      setDeleteConfirm({ isOpen: false });
    } catch (err) {
      error('Error al eliminar tienda');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = async (formData: FormData) => {
    try {
      setIsLoading(true);
      const latitudeValue = formData.get('latitude') as string;
      const longitudeValue = formData.get('longitude') as string;
      const capacityValue = formData.get('capacity') as string;

      const data = {
        name: (formData.get('name') as string) || '',
        address: (formData.get('address') as string) || '',
        city: (formData.get('city') as string) || '',
        latitude: latitudeValue ? parseFloat(latitudeValue) : undefined,
        longitude: longitudeValue ? parseFloat(longitudeValue) : undefined,
        capacity: capacityValue ? parseInt(capacityValue, 10) : undefined,
        status: (formData.get('status') as string) as 'active' | 'inactive' | undefined,
      };

      if (editingStore) {
        await updateStore(editingStore.storeId, data);
        success('Tienda actualizada exitosamente');
      } else {
        await createStore(data);
        success('Tienda creada exitosamente');
      }

      setIsFormOpen(false);
      setCurrentPage(1);
    } catch (err) {
      error('Error al guardar tienda');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: DataTableColumn<Store>[] = [
    {
      key: 'name',
      label: 'Nombre',
      width: '25%',
    },
    {
      key: 'address',
      label: 'Dirección',
      width: '25%',
    },
    {
      key: 'city',
      label: 'Ciudad',
      width: '20%',
    },
    {
      key: 'capacity',
      label: 'Capacidad',
      width: '15%',
      render: (value) => (value !== undefined && value !== null ? String(value) : 'N/A'),
    },
    {
      key: 'status',
      label: 'Estado',
      width: '15%',
      render: (value) => (String(value).toUpperCase()),
    },
  ];

  const actions: DataTableAction<Store>[] = [
    {
      label: 'Editar',
      icon: '✏️',
      onClick: (store) => handleEditStore(store),
      variant: 'secondary',
    },
    {
      label: 'Eliminar',
      icon: '🗑️',
      onClick: (store) => handleDeleteClick(store.storeId),
      variant: 'destructive',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text">Gestión de Tiendas</h1>
            <p className="text-text-muted mt-2">
              Administra las sucursales y ubicaciones de tiendas
            </p>
          </div>
          <div className="w-full md:w-auto">
            <button
              onClick={handleAddStore}
              className="w-full md:w-auto px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium"
            >
              ➕ Agregar Tienda
            </button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable<Store>
          columns={columns}
          data={stores}
          actions={actions}
          isLoading={isLoading}
          onSearch={handleSearch}
          searchPlaceholder="Buscar por nombre, dirección o ciudad..."
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
          }}
          emptyMessage="No hay tiendas disponibles"
        />
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={isFormOpen}
        title={editingStore ? 'Editar Tienda' : 'Crear Tienda'}
        onClose={() => {
          setIsFormOpen(false);
          setEditingStore(null);
        }}
        onSubmit={handleFormSubmit}
        isLoading={isLoading}
        submitText={editingStore ? 'Actualizar' : 'Crear'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Nombre de la Tienda</label>
            <input
              type="text"
              name="name"
              required
              defaultValue={editingStore?.name || ''}
              placeholder="Nombre de la tienda"
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Dirección</label>
            <input
              type="text"
              name="address"
              required
              defaultValue={editingStore?.address || ''}
              placeholder="Dirección completa"
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Ciudad</label>
            <input
              type="text"
              name="city"
              required
              defaultValue={editingStore?.city || ''}
              placeholder="Ciudad"
              className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Latitud (opcional)</label>
              <input
                type="number"
                name="latitude"
                step="0.000001"
                defaultValue={editingStore?.latitude ?? ''}
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
                defaultValue={editingStore?.longitude ?? ''}
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
                defaultValue={editingStore?.capacity ?? ''}
                placeholder="100"
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text placeholder-text-muted focus:outline-none focus:border-border-focus transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Estado</label>
              <select
                name="status"
                required
                defaultValue={editingStore?.status || 'active'}
                className="w-full px-4 py-2 rounded-lg border border-border bg-bg text-text focus:outline-none focus:border-border-focus transition-colors"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </FormModal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        title="Confirmar eliminación"
        message="¿Estás seguro de que deseas eliminar esta tienda? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ isOpen: false })}
        isConfirmLoading={isLoading}
      />
    </AdminLayout>
  );
}
