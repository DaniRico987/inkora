import { Button } from '../Components/Button';
import { clearAccessToken } from '../auth/session';

export function AdminPage() {
  const handleLogout = () => {
    clearAccessToken();
    window.location.href = '/login';
  };

  return (
    <section className="w-full max-w-4xl px-6 py-12">
      <div className="rounded-2xl border border-border bg-bg-secondary p-8 shadow-lg">
        <h1 className="text-3xl font-semibold text-text">Panel administrador</h1>
        <p className="mt-3 text-text-muted">
          Acceso autorizado para usuarios admin o root.
        </p>

        <div className="mt-8">
          <Button type="button" variant="secondary" size="auto" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </section>
  );
}
