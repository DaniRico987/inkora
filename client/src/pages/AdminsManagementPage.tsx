import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../Components/AdminLayout';
import {
  DataTable,
  type DataTableColumn,
  type DataTableAction,
} from '../Components/DataTable';
import { useSnackbar } from '../Components/SnackbarProvider';
import { ConfirmationModal } from '../Components/ConfirmationModal';
import { getAdmins, deactivateAdmin, activateAdmin } from '../api/admin';
import { getRoleFromToken, getAccessToken } from '../auth/session';
import type { Admin } from '../interfaces/admin';
import { StatusBadge } from '../Components/StatusBadge';

export function AdminsManagementPage() {
  const navigate = useNavigate();
  const { success, error } = useSnackbar();
  const token = getAccessToken();
  const currentUserRole = getRoleFromToken(token);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionConfirm, setActionConfirm] = useState<{
    isOpen: boolean;
    userId?: number;
    action?: 'deactivate' | 'activate';
  }>({ isOpen: false });

  // Only root can see this page
  const isRootOnly = currentUserRole !== 'root';

  // Redirect non-root users
  useEffect(() => {
    if (isRootOnly) {
      navigate('/admin', { replace: true });
    }
  }, [isRootOnly, navigate]);

  // Fetch admins
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setIsLoading(true);
        const data = await getAdmins(currentPage, 10);
        setAdmins(data.items || []);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        error('Error al cargar administradores');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isRootOnly) {
      fetchAdmins();
    }
  }, [currentPage, error, isRootOnly]);

  const handleActionClick = (
    userId: number,
    action: 'deactivate' | 'activate',
  ) => {
    setActionConfirm({ isOpen: true, userId, action });
  };

  const handleActionConfirm = async () => {
    if (!actionConfirm.userId || !actionConfirm.action) return;

    try {
      setIsLoading(true);
      if (actionConfirm.action === 'deactivate') {
        await deactivateAdmin(actionConfirm.userId.toString());
        success('Administrador desactivado exitosamente');
      } else {
        await activateAdmin(actionConfirm.userId.toString());
        success('Administrador activado exitosamente');
      }
      setCurrentPage(1);
      setActionConfirm({ isOpen: false });
    } catch (err) {
      error('Error en la operación');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: DataTableColumn<Admin>[] = [
    {
      key: 'username',
      label: 'Usuario',
      width: '25%',
    },
    {
      key: 'email',
      label: 'Email',
      width: '35%',
    },
    {
      key: 'isActive',
      label: 'Estado',
      render: (value) => (
        <StatusBadge
          label={value ? 'Activo' : 'Inactivo'}
          tone={value ? 'success' : 'neutral'}
        />
      ),
      width: '20%',
    },
    {
      key: 'createdAt',
      label: 'Creado',
      render: (value) => (value ? new Date(String(value)).toLocaleDateString('es-ES') : '-'),
      width: '20%',
    },
  ];

  const actions: DataTableAction<Admin>[] = [
    {
      label: 'Desactivar',
      icon: '🔒',
      onClick: (admin) => handleActionClick(admin.userId, 'deactivate'),
      variant: 'destructive',
      show: (admin) => admin.isActive === true,
    },
    {
      label: 'Activar',
      icon: '🔓',
      onClick: (admin) => handleActionClick(admin.userId, 'activate'),
      variant: 'secondary',
      show: (admin) => admin.isActive !== true,
    },
  ];

  if (isRootOnly) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text">
            Gestión de Administradores
          </h1>
          <p className="text-text-muted mt-2">
            Administra los permisos y estado de los administradores del sistema
          </p>
        </div>

        {/* Data Table */}
        <DataTable<Admin>
          columns={columns}
          data={admins}
          actions={actions}
          isLoading={isLoading}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
          }}
          emptyMessage="No hay administradores disponibles"
        />
      </div>

      {/* Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={actionConfirm.isOpen}
        title={
          actionConfirm.action === 'deactivate'
            ? 'Desactivar Administrador'
            : 'Activar Administrador'
        }
        message={
          actionConfirm.action === 'deactivate'
            ? '¿Estás seguro de que deseas desactivar este administrador? No podrá iniciar sesión.'
            : '¿Estás seguro de que deseas activar este administrador?'
        }
        confirmText={
          actionConfirm.action === 'deactivate' ? 'Desactivar' : 'Activar'
        }
        cancelText="Cancelar"
        onConfirm={handleActionConfirm}
        onCancel={() => setActionConfirm({ isOpen: false })}
        isConfirmLoading={isLoading}
      />
    </AdminLayout>
  );
}
