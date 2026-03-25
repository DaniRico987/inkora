import { useState } from 'react';
import { Button } from '../Components/Button';
import {
  Checkbox,
  InputPassword,
  InputSearch,
  InputSelect,
  InputText,
  InputTextarea,
} from '../Components/Inputs';
import { ErrorInLine } from '../Components/ErrorInline';
import { ConfirmationModal } from '../Components/ConfirmationModal';
import { Spinner } from '../Components/Spinner';
import { StatusBadge } from '../Components/StatusBadge';
import { Pagination } from '../Components/Pagination';
import { Footer } from '../Components/Footer';
import { useSnackbar } from '../Components/SnackbarProvider';
import { NavBar } from '../Components/NavBar';

export function ComponentsTestPage() {
  const { info, success, warning, error } = useSnackbar();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [role, setRole] = useState('lector');
  const [terms, setTerms] = useState(false);
  const [search, setSearch] = useState('');
  const [errorCountdownSeed, setErrorCountdownSeed] = useState(Date.now());
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [pageAtStart, setPageAtStart] = useState(1);
  const [pageAtMiddle, setPageAtMiddle] = useState(372);
  const [pageAtEnd, setPageAtEnd] = useState(744);

  return (
    <div className="w-full min-h-screen px-4 py-8 flex flex-col">
      <NavBar variant="client" />
      <div className="w-full max-w-5xl mx-auto bg-bg-secondary rounded-2xl shadow-lg p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-text mb-2">Pagina de prueba de componentes</h1>
        <p className="text-sm text-text-muted mb-8">
          Playground para validar apariencia, estados y comportamiento de los componentes base.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="space-y-4">
            <h2 className="text-lg font-medium text-text">Inputs</h2>

            <InputText
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <InputPassword
              label="Contrasena"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <InputSelect
              label="Rol"
              value={role}
              options={[
                { label: 'Lector', value: 'lector' },
                { label: 'Autor', value: 'autor' },
                { label: 'Admin', value: 'admin' },
              ]}
              onChange={(e) => setRole(e.target.value)}
            />

            <InputTextarea
              label="Notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />

            <InputSearch
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en la demo"
            />

            <Checkbox
              label="Acepto terminos de prueba"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium text-text">Botones y feedback</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button variant="primary" onClick={() => info('Boton primary presionado')}>
                Primary
              </Button>
              <Button variant="secondary" onClick={() => success('Accion completada correctamente')}>
                Secondary
              </Button>
              <Button variant="destructive" onClick={() => error('Accion destructiva de ejemplo')}>
                Destructive
              </Button>
              <Button disabled onClick={() => undefined}>
                Disabled
              </Button>
              <Button loading onClick={() => undefined}>
                Loading
              </Button>
              <Button
                onClick={() => warning('Mensaje repetible', { dedupeKey: 'warning-demo' })}
              >
                Snackbar dedupe
              </Button>
              <Button variant="destructive" onClick={() => setIsConfirmModalOpen(true)}>
                Abrir modal
              </Button>
            </div>

            <div className="mt-4 rounded-xl border border-border p-4 bg-bg-card/30">
              <h3 className="text-sm font-medium text-text mb-2">ErrorLine con countdown</h3>
              <ErrorInLine
                title="Cuenta bloqueada por intentos fallidos de ejemplo."
                failedAttempts={{ current: 5, max: 5 }}
                countdown={{ expiresAtMs: errorCountdownSeed + 90000 }}
                countdownLabel="Disponible en:"
                onExpire={() => success('La cuenta regresiva llego a cero')}
              />
              <div className="mt-3">
                <Button
                  variant="secondary"
                  size="14rem"
                  onClick={() => setErrorCountdownSeed(Date.now())}
                >
                  Reiniciar countdown
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border p-4 bg-bg-card/30">
              <h3 className="text-sm font-medium text-text mb-2">Spinner / Loader</h3>
              <div className="rounded-2xl border border-border/70 bg-bg-secondary/70 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <Spinner size="sm" tone="brand" label="Cargando" />
                  <Spinner size="md" tone="calm" label="Sincronizando" />
                  <Spinner size="lg" tone="danger" label="Procesando" />
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="14rem"
                  onClick={() => setIsPageLoading(true)}
                >
                  Simular carga global
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-border p-4 bg-bg-card/30">
              <h3 className="text-sm font-medium text-text mb-3">Status Badge</h3>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge label="Activo" tone="success" />
                <StatusBadge label="Pendiente" tone="warning" />
                <StatusBadge label="Bloqueado" tone="danger" />
                <StatusBadge label="En revision" tone="info" />
                <StatusBadge label="Inactivo" tone="neutral" />
                <StatusBadge label="Sin punto" tone="neutral" withDot={false} size="sm" />
              </div>
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-xl border border-border p-4 sm:p-5 bg-bg-card/30">
          <h2 className="text-lg font-medium text-text mb-4">Pagination</h2>

          <div className="space-y-7">
            <div>
              <h3 className="text-sm font-medium text-text mb-2">First page</h3>
              <Pagination
                currentPage={pageAtStart}
                totalPages={744}
                onPageChange={setPageAtStart}
                showGoToInput
              />
            </div>

            <div>
              <h3 className="text-sm font-medium text-text mb-2">Page in the middle</h3>
              <Pagination
                currentPage={pageAtMiddle}
                totalPages={744}
                onPageChange={setPageAtMiddle}
                showGoToInput
              />
            </div>

            <div>
              <h3 className="text-sm font-medium text-text mb-2">Go to page</h3>
              <Pagination
                currentPage={pageAtEnd}
                totalPages={744}
                onPageChange={setPageAtEnd}
                showGoToInput
              />
            </div>
          </div>
        </section>

      </div>

      <div className="w-full max-w-5xl mx-auto mt-8">
        <Footer
          brandName="Inkora"
          description="Conecta lectores, autores y administradores en una experiencia simple y moderna."
          sections={[
            {
              title: 'Producto',
              links: [
                { label: 'Catalogo', href: '#' },
                { label: 'Categorias', href: '#' },
                { label: 'Autores', href: '#' },
              ],
            },
            {
              title: 'Soporte',
              links: [
                { label: 'Centro de ayuda', href: '#' },
                { label: 'Contacto', href: '#' },
                { label: 'Reportar problema', href: '#' },
              ],
            },
            {
              title: 'Legal',
              links: [
                { label: 'Privacidad', href: '#' },
                { label: 'Terminos', href: '#' },
                { label: 'Cookies', href: '#' },
              ],
            },
          ]}
        />
      </div>

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        message="Esta seguro de querer eliminar libro?"
        title="Confirmar eliminacion"
        cancelText="Cancelar"
        confirmText="Confirmar"
        onCancel={() => setIsConfirmModalOpen(false)}
        onConfirm={() => {
          setIsConfirmModalOpen(false);
          success('Libro eliminado (demo)');
        }}
      />

      {isPageLoading && (
        <Spinner size="lg" tone="brand" label="Cargando datos de ejemplo..." fullScreen />
      )}

      {isPageLoading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-9999 w-[min(92vw,20rem)]">
          <Button
            variant="destructive"
            onClick={() => setIsPageLoading(false)}
          >
            Detener carga
          </Button>
        </div>
      )}
    </div>
  );
}
