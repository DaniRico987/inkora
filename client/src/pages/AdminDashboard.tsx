import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../Components/AdminLayout';
import { getAdminStats } from '../api/admin';
import { getRoleFromToken, getAccessToken } from '../auth/session';
import { Spinner } from '../Components/Spinner';
import { Link } from 'react-router-dom';
import type { AdminStats } from '../interfaces/admin';

export function AdminDashboard() {
  const navigate = useNavigate();
  const token = getAccessToken();
  const role = getRoleFromToken(token);
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect root users
  useEffect(() => {
    if (role === 'root') {
      navigate('/admin/create-admin', { replace: true });
    }
  }, [role, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const data = await getAdminStats();
        setStats(data);
        setError(null);
      } catch (err) {
        setError('Error al cargar estadísticas');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Dashboard</h1>
          <p className="text-text-muted mt-2">
            Bienvenido al panel de administración de Inkora
          </p>
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-600 px-4 py-3 rounded-lg">
            {error}
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
                  <Link to="/admin/books">
                    <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-border transition-colors text-text">
                      ➕ Crear nuevo libro
                    </button>
                  </Link>
                  <Link to="/admin/stores">
                    <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-border transition-colors text-text">
                      ➕ Crear nueva tienda
                    </button>
                  </Link>
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
    </AdminLayout>
  );
}
