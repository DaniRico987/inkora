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
import { useSnackbar } from '../Components/SnackbarProvider';

export function ComponentsTestPage() {
  const { info, success, warning, error } = useSnackbar();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [role, setRole] = useState('lector');
  const [terms, setTerms] = useState(false);
  const [search, setSearch] = useState('');
  const [errorCountdownSeed, setErrorCountdownSeed] = useState(Date.now());

  return (
    <div className="w-full px-4 py-8">
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
          </section>
        </div>
      </div>
    </div>
  );
}
