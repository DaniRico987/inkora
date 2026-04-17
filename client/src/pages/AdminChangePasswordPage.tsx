import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputPassword } from '../Components/Inputs';
import { Button } from '../Components/Button';
import { useSnackbar } from '../Components/SnackbarProvider';
import { useTheme } from '../theme/useTheme';
import { changePassword } from '../api/auth';

export function AdminChangePasswordPage() {
  useTheme();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const { success, error } = useSnackbar();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPassword || !confirmPassword) {
      setErrorMessage('Completa ambos campos para continuar.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await changePassword(newPassword);
      sessionStorage.setItem('inkora_access_token', response.accessToken);
      success('Contraseña actualizada correctamente. Redirigiendo al panel...');
      navigate('/admin', { replace: true });
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message || err?.message;
      setErrorMessage(
        apiMessage ||
          'No se pudo cambiar la contraseña. Intenta nuevamente más tarde.',
      );
      error('No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-bg-secondary p-8 shadow-lg">
        <h1 className="text-3xl font-semibold text-text mb-3">
          Cambiar contraseña
        </h1>
        <p className="text-sm text-text-muted mb-6">
          Debes actualizar tu contraseña temporal antes de poder usar el panel.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <InputPassword
            label="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <InputPassword
            label="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {errorMessage && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <Button type="submit" variant="primary" size="100%" loading={loading}>
            Actualizar contraseña
          </Button>
        </form>
      </div>
    </div>
  );
}
