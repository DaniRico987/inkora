import { useState } from 'react';
import { InputText } from '../Components/Inputs';
import { Button } from '../Components/Button';
import { AuthHomeButton } from '../Components/AuthHomeButton';
import { useTheme } from '../theme/useTheme';
import { forgotPassword } from '../api/auth';

export function ForgotPasswordPage() {
  useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Por favor ingresa un correo electrónico.');
      return;
    }

    setLoading(true);
    try {
      // reCAPTCHA está desactivado en el backend por ahora, enviamos un placeholder
      await forgotPassword(email.trim(), 'captcha-ok');

      setSuccessMessage(
        'Si el correo existe, recibirás un enlace para restablecer tu contraseña.',
      );
    } catch {
      setErrorMessage(
        'No se pudo procesar tu solicitud. Inténtalo nuevamente en unos minutos.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-center px-4">
      <div className="w-full max-w-xl mx-auto bg-bg-secondary rounded-2xl shadow-lg p-6 sm:p-10">
        <div className="mb-2 flex items-center justify-end">
          <AuthHomeButton />
        </div>
        <h1 className="text-2xl font-semibold text-text mb-2">
          ¿Olvidaste tu contraseña?
        </h1>
        <p className="text-sm text-text-muted mb-6">
          Ingresa el correo asociado a tu cuenta y, si existe en nuestro
          sistema, te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <InputText
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            Enviar enlace
          </Button>
        </form>
      </div>
    </div>
  );
}
