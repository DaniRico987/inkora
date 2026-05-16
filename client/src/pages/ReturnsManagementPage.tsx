import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../Components/AdminLayout';
import { DataTable, type DataTableAction, type DataTableColumn } from '../Components/DataTable';
import { ConfirmationModal } from '../Components/ConfirmationModal';
import { RejectionModal } from '../Components/RejectionModal';
import { Spinner } from '../Components/Spinner';
import { useSnackbar } from '../Components/SnackbarProvider';
import { getAccessToken, getRoleFromToken } from '../auth/session';
import {
  approveReturn,
  getPendingReturns,
  type AdminReturnRequest,
} from '../api/admin';
import { rejectReturn } from '../api/admin';

type ReturnRow = AdminReturnRequest;

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function ReturnsManagementPage() {
  const navigate = useNavigate();
  const token = getAccessToken();
  const role = getRoleFromToken(token);
  const { success, error } = useSnackbar();

  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [approvalConfirm, setApprovalConfirm] = useState<{
    isOpen: boolean;
    returnBookId?: number;
  }>({ isOpen: false });
  const [rejectionConfirm, setRejectionConfirm] = useState<{
    isOpen: boolean;
    returnBookId?: number;
  }>({ isOpen: false });
  const [rejectionLoading, setRejectionLoading] = useState(false);

  useEffect(() => {
    if (role === 'root') {
      navigate('/admin/create-admin', { replace: true });
    }
  }, [role, navigate]);

  const loadPendingReturns = async () => {
    try {
      setIsLoading(true);
      const data = await getPendingReturns();
      setRows(data);
      setTotalPages(1);
    } catch (loadError) {
      error('Error al cargar solicitudes de devolucion');
      console.error(loadError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPendingReturns();
  }, []);

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      void loadPendingReturns();
      return;
    }

    const normalizedQuery = query.toLowerCase();
    const filtered = rows.filter((row) => {
      return (
        row.clientName.toLowerCase().includes(normalizedQuery) ||
        row.clientEmail.toLowerCase().includes(normalizedQuery) ||
        row.reasonLabel.toLowerCase().includes(normalizedQuery) ||
        (row.additionalDescription || '').toLowerCase().includes(normalizedQuery)
      );
    });

    setRows(filtered);
    setCurrentPage(1);
  };

  const openApproveConfirm = (returnBookId: number) => {
    setApprovalConfirm({ isOpen: true, returnBookId });
  };

  const handleApproveConfirm = async () => {
    if (!approvalConfirm.returnBookId) {
      return;
    }

    try {
      setIsLoading(true);
      await approveReturn(approvalConfirm.returnBookId);
      success('Solicitud aprobada. QR generado y enviado al cliente');
      setApprovalConfirm({ isOpen: false });
      await loadPendingReturns();
    } catch (approvalError) {
      error('No se pudo aprobar la solicitud');
      console.error(approvalError);
    } finally {
      setIsLoading(false);
    }
  };

  const openRejectConfirm = (returnBookId: number) => {
    setRejectionConfirm({ isOpen: true, returnBookId });
  };

  const handleRejectConfirm = async (adminNote?: string) => {
    if (!rejectionConfirm.returnBookId) return;

    try {
      setRejectionLoading(true);
      await rejectReturn(rejectionConfirm.returnBookId, adminNote);
      success('Solicitud rechazada. Se notifico al cliente');
      setRejectionConfirm({ isOpen: false });
      await loadPendingReturns();
    } catch (rejectError) {
      error('No se pudo rechazar la solicitud');
      console.error(rejectError);
    } finally {
      setRejectionLoading(false);
    }
  };

  const columns: DataTableColumn<ReturnRow>[] = useMemo(
    () => [
      {
        key: 'clientName',
        label: 'Solicitante',
        width: '18%',
        render: (_, row) => (
          <div>
            <p className="font-semibold text-text">{row.clientName}</p>
            <p className="text-xs text-text-muted">{row.clientEmail}</p>
          </div>
        ),
      },
      {
        key: 'reasonLabel',
        label: 'Motivo',
        width: '14%',
      },
      {
        key: 'additionalDescription',
        label: 'Descripcion',
        width: '23%',
        render: (value) => (
          <p className="line-clamp-3 text-sm text-text-muted">
            {value || 'Sin descripcion adicional'}
          </p>
        ),
      },
      {
        key: 'items',
        label: 'Imagenes / Libros',
        width: '28%',
        render: (_, row) => (
          <div className="space-y-2">
            {row.items.slice(0, 2).map((item) => (
              <div key={item.purchaseItemId} className="flex items-center gap-2">
                <div className="h-11 w-8 shrink-0 overflow-hidden rounded border border-border bg-bg">
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-text-muted">
                      N/A
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs font-semibold text-text">{item.title}</p>
                  <p className="text-[11px] text-text-muted">x{item.quantity}</p>
                </div>
              </div>
            ))}
            {row.items.length > 2 ? (
              <p className="text-[11px] text-text-muted">+{row.items.length - 2} item(s)</p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'requestDate',
        label: 'Solicitud',
        width: '17%',
        render: (_, row) => (
          <div>
            <p className="text-xs text-text-muted">{formatDate(row.requestDate)}</p>
            <p className="text-xs font-semibold text-text">{formatCurrency(row.totalAmount)}</p>
          </div>
        ),
      },
    ],
    [],
  );

  const actions: DataTableAction<ReturnRow>[] = [
    {
      label: 'Aprobar',
      icon: '✅',
      variant: 'primary',
      onClick: (row) => openApproveConfirm(row.returnBookId),
      show: (row) => row.status === 'pending',
    },
    {
      label: 'Rechazar',
      icon: '❌',
      variant: 'destructive',
      onClick: (row) => openRejectConfirm(row.returnBookId),
      show: (row) => row.status === 'pending',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text">Solicitudes de devolucion</h1>
            <p className="mt-2 text-text-muted">
              Gestiona devoluciones pendientes y revisa evidencia visual de los libros.
            </p>
          </div>
          <button
            onClick={() => {
              void loadPendingReturns();
            }}
            className="w-full rounded-lg border border-border bg-bg px-4 py-2 text-sm font-semibold text-text transition hover:border-babyblue-300 hover:text-babyblue-700 md:w-auto"
          >
            Refrescar
          </button>
        </div>

        {isLoading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <DataTable<ReturnRow>
            columns={columns}
            data={rows}
            actions={actions}
            isLoading={isLoading}
            onSearch={handleSearch}
            searchPlaceholder="Buscar por cliente, correo, motivo o descripcion..."
            pagination={{
              currentPage,
              totalPages,
              onPageChange: setCurrentPage,
            }}
            emptyMessage="No hay solicitudes de devolucion pendientes"
          />
        )}
      </div>

      <ConfirmationModal
        isOpen={approvalConfirm.isOpen}
        title="Aprobar solicitud"
        message="Se generara un QR unico en base64 y se enviara por correo al cliente. Esta accion no se puede deshacer."
        confirmText="Aprobar"
        cancelText="Cancelar"
        onConfirm={handleApproveConfirm}
        onCancel={() => setApprovalConfirm({ isOpen: false })}
      />
      <RejectionModal
        isOpen={rejectionConfirm.isOpen}
        title="Rechazar solicitud"
        message="Se rechazara la solicitud pendiente y se notificara al cliente por correo. Esta accion no se puede deshacer."
        confirmText="Rechazar"
        cancelText="Cancelar"
        onConfirm={(note) => void handleRejectConfirm(note)}
        onCancel={() => setRejectionConfirm({ isOpen: false })}
        isConfirmLoading={rejectionLoading}
      />
    </AdminLayout>
  );
}
