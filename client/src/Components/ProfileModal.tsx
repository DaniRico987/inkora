import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { InputText } from './Inputs';
import { getProfile, updateProfile } from '../api/auth';
import { useSnackbar } from '../Components/SnackbarProvider';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  birthDate: string;
  birthPlace: string;
  address: string;
  gender: string;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile>({
    dni: '',
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    birthDate: '',
    birthPlace: '',
    address: '',
    gender: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error: showError } = useSnackbar();

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const userProfile = await getProfile();
      setProfile({
        dni: userProfile.dni || '',
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
        username: userProfile.username || '',
        birthDate: userProfile.birthDate ? userProfile.birthDate.split('T')[0] : '',
        birthPlace: userProfile.birthPlace || '',
        address: userProfile.address || '',
        gender: userProfile.gender || '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      showError('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        birthDate: profile.birthDate,
        birthPlace: profile.birthPlace,
        address: profile.address,
        gender: profile.gender,
      });
      success('Perfil actualizado correctamente');
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-text mb-4">Mi Perfil</h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
              <p className="text-text-muted mt-2">Cargando...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg bg-bg p-3 mb-4">
                <p className="text-xs text-text-muted font-medium mb-2">DNI/CÉDULA</p>
                <p className="text-sm font-semibold text-text">{profile.dni}</p>
              </div>

              <InputText
                label="Nombre"
                value={profile.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
              />

              <InputText
                label="Apellido"
                value={profile.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
              />

              <InputText
                label="Email"
                type="email"
                value={profile.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={profile.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <InputText
                label="Lugar de Nacimiento"
                value={profile.birthPlace}
                onChange={(e) => handleInputChange('birthPlace', e.target.value)}
              />

              <InputText
                label="Dirección"
                value={profile.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Género
                </label>
                <select
                  value={profile.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                  className="flex-1"
                >
                  Guardar
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}