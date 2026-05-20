import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { InputText, InputPassword } from '../Components/Inputs';
import { Button } from '../Components/Button';
import { AuthHomeButton } from '../Components/AuthHomeButton';
import { ErrorInLine } from '../Components/ErrorInline';
import { useTheme } from '../theme/useTheme';
import { extractAuthError, login } from '../api/auth';
import {
  getIsTemporaryPasswordFromToken,
  getRoleFromToken,
  saveAccessToken,
} from '../auth/session';

type LoginErrorState = {
  title: string;
  failedAttempts?: { current: number; max: number };
  countdown?: { seconds: number };
};

function getRecaptchaApi() {
  return (
    window as Window & {
      grecaptcha?: {
        ready: (cb: () => void) => void;
        execute: (
          siteKey: string,
          options: { action: string },
        ) => Promise<string>;
      };
    }
  ).grecaptcha;
}

async function getRecaptchaV3Token(): Promise<string | undefined> {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
  if (!siteKey) return undefined;

  const grecaptcha = getRecaptchaApi();
  if (!grecaptcha) return undefined;

  await new Promise<void>((resolve) => grecaptcha.ready(resolve));
  return grecaptcha.execute(siteKey, { action: 'login' });
}

export function LoginPage() {
  useTheme();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<LoginErrorState | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const authOriginState =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state
      ? { from: (location.state as { from?: string }).from }
      : undefined;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorState(null);
    setSuccessMessage('');

    if (!identifier.trim() || !password.trim()) {
      setErrorState({
        title: 'Completa tu usuario/correo y contraseña para continuar.',
      });
      return;
    }

    setLoading(true);
    try {
      const recaptchaToken = requiresCaptcha
        ? await getRecaptchaV3Token()
        : undefined;

      const response = await login({
        identifier: identifier.trim(),
        password,
        recaptchaToken,
      });

      saveAccessToken(response.accessToken);
      const role = getRoleFromToken(response.accessToken);
      const requiresPasswordChange = getIsTemporaryPasswordFromToken(
        response.accessToken,
      );
      setRequiresCaptcha(false);
      setSuccessMessage('Inicio de sesión exitoso.');

      if (role === 'admin') {
        if (requiresPasswordChange) {
          navigate('/admin/change-password', { replace: true });
          return;
        }
        navigate('/admin', { replace: true });
        return;
      }

      if (role === 'root') {
        navigate('/admin/create-admin', { replace: true });
        return;
      }

      navigate('/', { replace: true });
    } catch (error) {
      const authError = extractAuthError(error);
      setRequiresCaptcha(Boolean(authError.requiresCaptcha));

      if (authError.accountBlocked) {
        const blockedReason =
          authError.message ||
          'Cuenta bloqueada temporalmente por múltiples intentos fallidos';
        setErrorState({
          title: blockedReason,
          failedAttempts: {
            current: authError.failedAttempts ?? 5,
            max: 5,
          },
          countdown:
            typeof authError.remainingBlockSeconds === 'number'
              ? { seconds: authError.remainingBlockSeconds }
              : undefined,
        });
      } else {
        const defaultMessage = authError.requiresCaptcha
          ? 'Se validará reCAPTCHA automáticamente. La cuenta se bloquea al quinto intento fallido.'
          : 'Usuario o contraseña inválidos.';
        setErrorState({
          title: authError.message || defaultMessage,
          failedAttempts:
            typeof authError.failedAttempts === 'number'
              ? { current: authError.failedAttempts, max: 5 }
              : undefined,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-center px-4 py-8 md:py-10">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-white/30 bg-white/10 shadow-2xl backdrop-blur-2xl">
        <div className="grid md:grid-cols-2 min-h-144">
          <div className="relative isolate overflow-hidden bg-bg-secondary">
            <div className="absolute left-0 top-0 z-20 h-96 w-96 sm:h-136 sm:w-136 -translate-x-1/4 -translate-y-1/4 rounded-full bg-linear-to-br from-skyblue-100 via-skyblue-300 to-primary-600 border border-white/55 shadow-[inset_-26px_-26px_52px_rgba(10,35,85,0.35),inset_22px_22px_42px_rgba(255,255,255,0.28),0_16px_35px_rgba(22,63,136,0.28)]">
              <span className="absolute left-[18%] top-[15%] h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/40 blur-[1px]" />
              <div className="absolute left-[58%] top-[58%] w-44 sm:w-56 -translate-x-1/2 -translate-y-1/2 pr-2">
                <h2 className="text-xl sm:text-3xl font-semibold leading-tight text-white">
                  Bienvenido
                </h2>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-white/90">
                  Tu mundo de lectura te espera. Inicia sesión y continúa donde
                  te quedaste.
                </p>
              </div>
            </div>

            <div className="absolute left-[31%] top-[52%] z-30 h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-linear-to-br from-skyblue-100 via-skyblue-300 to-primary-600 border border-white/55 shadow-[inset_-18px_-18px_34px_rgba(10,35,85,0.3),inset_12px_12px_20px_rgba(255,255,255,0.28),0_12px_24px_rgba(22,63,136,0.2)]">
              <span className="absolute left-[16%] top-[14%] h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/35 blur-[1px]" />
            </div>

            <div className="absolute left-[3%] bottom-[8%] z-10 h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-linear-to-br from-skyblue-100 via-skyblue-300 to-primary-600 border border-white/55 shadow-[inset_-14px_-14px_26px_rgba(10,35,85,0.28),inset_10px_10px_16px_rgba(255,255,255,0.26),0_10px_20px_rgba(22,63,136,0.2)]">
              <span className="absolute left-[18%] top-[14%] h-6 w-6 rounded-full bg-white/35 blur-[1px]" />
            </div>
          </div>

          <div className="px-6 py-8 sm:px-9 sm:py-10 md:px-10 md:py-12 bg-bg-secondary">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.16em] text-text-muted">
                Acceso seguro
              </p>
              <AuthHomeButton />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-text mb-2">
              Iniciar sesión
            </h1>
            <p className="text-sm text-text-muted mb-6">
              Usa tus credenciales para entrar a tu espacio personal.
            </p>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 [&_input]:border-border [&_input]:bg-bg-input [&_input]:text-text [&_input]:placeholder:text-placeholder [&_input]:focus:border-border-focus [&_input]:shadow-none [&_label>span:first-of-type]:border-border [&_label>span:last-of-type]:text-label"
            >
              <InputText
                label="Username"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />

              <InputPassword
                label="Contraseña"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className="flex items-center justify-end gap-3">
                <Link
                  to="/forgot-password"
                  state={authOriginState}
                  className="text-sm text-primary-500 hover:text-primary-600 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {errorState && (
                <ErrorInLine
                  title={errorState.title}
                  failedAttempts={errorState.failedAttempts}
                  countdown={errorState.countdown}
                />
              )}

              {successMessage && (
                <div className="text-sm text-emerald-300">{successMessage}</div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="100%"
                loading={loading}
                className=""
              >
                Entrar
              </Button>
            </form>

            <p className="mt-6 text-sm text-text-muted text-center">
              ¿Aún no tienes cuenta?{' '}
              <Link
                to="/register"
                state={authOriginState}
                className="text-sm text-primary-500 hover:text-primary-600 transition-colors font-medium"
              >
                Crear cuenta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
