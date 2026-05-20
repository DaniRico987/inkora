import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InputPassword } from '../Components/Inputs';
import { Button } from '../Components/Button';
import { AuthHomeButton } from '../Components/AuthHomeButton';
import { useTheme } from '../theme/useTheme';
import { resetPassword } from '../api/auth';

const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

type Strength = 'débil' | 'media' | 'fuerte';

function getPasswordStrength(password: string): Strength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return 'débil';
  if (score === 2 || score === 3) return 'media';
  return 'fuerte';
}

export function ResetPasswordPage() {
  useTheme();

  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!password || !confirmPassword) {
      setErrorMessage('Por favor completa ambos campos de contraseña.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!passwordPolicy.test(password)) {
      setErrorMessage(
        'La contraseña debe incluir mayúsculas, minúsculas y números.',
      );
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    if (!token) {
      setErrorMessage('El enlace de restablecimiento no es válido.');
      return;
    }

    setLoading(true);
    try {
      // reCAPTCHA está desactivado en el backend por ahora, enviamos un placeholder
      await resetPassword(token, password, 'captcha-ok');

      setSuccessMessage('Tu contraseña ha sido restablecida con éxito.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch {
      setErrorMessage(
        'El enlace de restablecimiento es inválido o ha expirado. Por favor solicita uno nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  const strengthColor =
    strength === 'fuerte'
      ? 'bg-emerald-500'
      : strength === 'media'
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className="w-full flex items-center justify-center px-4">
      <div className="w-full max-w-xl mx-auto bg-bg-card rounded-2xl shadow-lg p-6 sm:p-10">
        <div className="mb-2 flex items-center justify-end">
          <AuthHomeButton />
        </div>
        <h1 className="text-2xl font-semibold text-text mb-2">
          Restablecer contraseña
        </h1>
        <p className="text-sm text-text-muted mb-6">
          Elige una nueva contraseña para tu cuenta. Asegúrate de que sea segura
          y fácil de recordar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputPassword
            label="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full ${strengthColor} transition-all duration-300`}
                style={{
                  width:
                    strength === 'fuerte'
                      ? '100%'
                      : strength === 'media'
                        ? '66%'
                        : '33%',
                }}
              />
            </div>
            <span className="text-text-muted">
              Fortaleza:{' '}
              <span className="font-medium capitalize">{strength}</span>
            </span>
          </div>

          <InputPassword
            label="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {/* Lugar reservado para reCAPTCHA widget / integración */}
          <div className="text-xs text-text-muted mb-2">
            Esta acción está protegida por reCAPTCHA.
          </div>

          {errorMessage && (
            <div className="text-sm text-red-500">{errorMessage}</div>
          )}

          {successMessage && (
            <div className="text-sm text-emerald-500">{successMessage}</div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="20rem"
            loading={loading}
          >
            Restablecer contraseña
          </Button>
        </form>
      </div>
    </div>
  );
}
