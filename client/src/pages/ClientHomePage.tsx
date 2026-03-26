import { Link } from 'react-router-dom';
import { Button } from '../Components/Button';
import { clearAccessToken } from '../auth/session';

export function ClientHomePage() {
  const handleLogout = () => {
    clearAccessToken();
    window.location.href = '/login';
  };

  return (
    <section className="w-full max-w-4xl px-6 py-12">
      <div className="rounded-2xl border border-border bg-bg-secondary p-8 shadow-lg">
        <h1 className="text-3xl font-semibold text-text">Inicio cliente</h1>
        <p className="mt-3 text-text-muted">
          Sesión iniciada correctamente. Esta ruta corresponde al inicio para clientes.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/admin"
            className="text-sm text-primary-500 hover:text-primary-600 transition-colors"
          >
            Ir a admin
          </Link>
          <Button type="button" variant="secondary" size="auto" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </section>
  );
}
