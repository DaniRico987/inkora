import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../Components/AdminLayout';
import { Pagination } from '../Components/Pagination';
import { Spinner } from '../Components/Spinner';
import { StatusBadge } from '../Components/StatusBadge';
import { useSnackbar } from '../Components/SnackbarProvider';
import { getAccessToken, getRoleFromToken } from '../auth/session';
import {
  getAuditLogs,
  type AuditLogItem,
  type GetAuditLogsParams,
} from '../api/admin';

type ActionFilterOption = {
  value: string;
  label: string;
};

const actionFilterOptions: ActionFilterOption[] = [
  { value: '', label: 'Todas las acciones' },
  { value: 'compra', label: 'Compras' },
  { value: 'reserva', label: 'Reservas' },
  { value: 'devolucion', label: 'Devoluciones' },
  { value: 'admin', label: 'Cambios administrativos' },
  { value: 'elimin', label: 'Eliminaciones' },
  { value: 'edit', label: 'Modificaciones' },
];

type FilterState = {
  user: string;
  action: string;
  startDate: string;
  endDate: string;
};

function toStartDateIso(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  const date = new Date(`${dateValue}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function toEndDateIso(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  const date = new Date(`${dateValue}T23:59:59.999Z`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
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

function normalizeActionLabel(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActionTone(action: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  const normalized = action.toLowerCase();

  if (normalized.includes('compra') || normalized.includes('reserva') || normalized.includes('cread')) {
    return 'success';
  }

  if (normalized.includes('elimin') || normalized.includes('desactiv') || normalized.includes('rechaz')) {
    return 'danger';
  }

  if (normalized.includes('edit') || normalized.includes('modific') || normalized.includes('actualiz') || normalized.includes('aprob')) {
    return 'warning';
  }

  if (normalized.includes('devolucion') || normalized.includes('perfil') || normalized.includes('admin')) {
    return 'info';
  }

  return 'neutral';
}

function prettyDetail(detail: string | null): string {
  if (!detail) {
    return '-';
  }

  try {
    const parsed = JSON.parse(detail) as Record<string, unknown>;
    const method = typeof parsed.method === 'string' ? parsed.method : null;
    const path = typeof parsed.path === 'string' ? parsed.path : null;

    if (method && path) {
      return `${method} ${path}`;
    }

    return JSON.stringify(parsed);
  } catch {
    return detail;
  }
}

export function AuditLogsPage() {
  const navigate = useNavigate();
  const { error } = useSnackbar();
  const token = getAccessToken();
  const role = getRoleFromToken(token);

  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<FilterState>({
    user: '',
    action: '',
    startDate: '',
    endDate: '',
  });

  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    user: '',
    action: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (role !== 'root') {
      navigate('/admin', { replace: true });
    }
  }, [role, navigate]);

  const apiParams = useMemo<GetAuditLogsParams>(() => ({
    page: currentPage,
    limit: 10,
    user: appliedFilters.user.trim() || undefined,
    action: appliedFilters.action || undefined,
    startDate: toStartDateIso(appliedFilters.startDate),
    endDate: toEndDateIso(appliedFilters.endDate),
  }), [currentPage, appliedFilters]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setIsLoading(true);
        const response = await getAuditLogs(apiParams);
        setLogs(response.items || []);
        setCurrentPage(response.page || 1);
        setTotalPages(response.totalPages || 1);
        setTotal(response.total || 0);
      } catch (loadError) {
        error('No se pudo cargar el historial de auditoria');
        console.error(loadError);
      } finally {
        setIsLoading(false);
      }
    };

    if (role === 'root') {
      void loadLogs();
    }
  }, [apiParams, error, role]);

  const onFilterInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCurrentPage(1);
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    const initial: FilterState = {
      user: '',
      action: '',
      startDate: '',
      endDate: '',
    };

    setFilters(initial);
    setAppliedFilters(initial);
    setCurrentPage(1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Auditoria del sistema</h1>
          <p className="mt-2 text-text-muted">
            Historial de operaciones criticas filtrable por usuario, accion y fecha.
          </p>
        </div>

        <form
          onSubmit={applyFilters}
          className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-bg-secondary p-4 md:grid-cols-5"
        >
          <div className="md:col-span-2">
            <label htmlFor="user" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Usuario
            </label>
            <input
              id="user"
              name="user"
              type="text"
              value={filters.user}
              onChange={onFilterInputChange}
              placeholder="Email o username"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition focus:border-border-focus"
            />
          </div>

          <div>
            <label htmlFor="action" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Accion
            </label>
            <select
              id="action"
              name="action"
              value={filters.action}
              onChange={onFilterInputChange}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition focus:border-border-focus"
            >
              {actionFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="startDate" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Desde
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              value={filters.startDate}
              onChange={onFilterInputChange}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition focus:border-border-focus"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-muted">
              Hasta
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              value={filters.endDate}
              onChange={onFilterInputChange}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition focus:border-border-focus"
            />
          </div>

          <div className="md:col-span-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-border bg-bg px-4 py-2 text-sm font-semibold text-text transition hover:bg-border"
            >
              Limpiar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              Filtrar
            </button>
          </div>
        </form>

        <div className="rounded-lg border border-border bg-bg-secondary overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p className="text-lg">No hay eventos de auditoria para los filtros aplicados</p>
            </div>
          ) : (
            <table className="w-full min-w-245">
              <thead className="border-b border-border bg-bg">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Fecha</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Usuario</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Accion</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Entidad afectada</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-text">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.logId} className="hover:bg-bg transition-colors">
                    <td className="px-4 py-3 text-sm text-text">{formatDateTime(log.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-text">
                      <div>
                        <p className="font-semibold text-text">{log.user?.username || `user-${log.userId}`}</p>
                        <p className="text-xs text-text-muted">{log.user?.email || '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text">
                      <StatusBadge
                        label={normalizeActionLabel(log.action)}
                        tone={getActionTone(log.action)}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-text">
                      <p className="font-medium">{log.affectedEntity || '-'}</p>
                      <p className="text-xs text-text-muted">
                        {log.affectedEntityId ? `ID ${log.affectedEntityId}` : 'Sin identificador'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-text max-w-md">
                      <p className="line-clamp-2 text-text-muted">{prettyDetail(log.detail)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">
            Total de registros: <span className="font-semibold text-text">{total}</span>
          </p>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
