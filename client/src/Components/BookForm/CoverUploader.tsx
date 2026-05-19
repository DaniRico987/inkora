import { useState } from 'react';
import { Box, Typography, CircularProgress, SvgIcon } from '@mui/material';
import { useSnackbar } from '../SnackbarProvider';
import { uploadBookImage } from '../../api/books';

interface CoverUploaderProps {
  bookId?: number;
  initialCoverUrl?: string;
  onCoverChange?: (url: string) => void;
  onCoverUpload?: (file: File) => Promise<void>;
  disabled?: boolean;
}

function UploadIcon(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M5 20h14v-2H5v2zm7-18l-5 5h3v4h4v-4h3l-5-5z" />
    </SvgIcon>
  );
}

export function CoverUploader({
  bookId,
  initialCoverUrl,
  onCoverChange,
  onCoverUpload,
  disabled = false,
}: CoverUploaderProps) {
  const { success, error: showError } = useSnackbar();
  const [preview, setPreview] = useState<string | null>(initialCoverUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showError('Solo se permiten imágenes JPG, PNG o WEBP');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showError('La imagen no debe exceder 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      if (!bookId) {
        onCoverChange?.(result);
      }
    };
    reader.readAsDataURL(file);

    // Upload immediately if the book exists, otherwise queue the file for later.
    if (bookId) {
      setIsUploading(true);
      try {
        const response = await uploadBookImage(bookId.toString(), file);
        success('Portada subida exitosamente');
        if (response.coverUrl) {
          setPreview(response.coverUrl);
          onCoverChange?.(response.coverUrl);
        }
      } catch (err) {
        showError('Error al subir la portada');
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    } else if (onCoverUpload) {
      try {
        await onCoverUpload(file);
      } catch (err) {
        showError('Error al procesar la portada');
        console.error(err);
      }
    }
  };

  return (
    <Box>
      {preview && (
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <img
            src={preview}
            alt="Portada preview"
            style={{
              maxWidth: '200px',
              maxHeight: '300px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
        </Box>
      )}

      <Box
        sx={{
          border: '2px dashed #ccc',
          borderRadius: '8px',
          p: 3,
          textAlign: 'center',
          cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.3s',
          '&:hover': {
            borderColor: disabled || isUploading ? '#ccc' : '#1976d2',
          },
          opacity: disabled || isUploading ? 0.6 : 1,
        }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          style={{ display: 'none' }}
          id="cover-input"
        />
        <label htmlFor="cover-input" style={{ cursor: 'inherit' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            {isUploading ? (
              <CircularProgress size={40} />
            ) : (
              <UploadIcon sx={{ fontSize: 48, color: '#1976d2' }} />
            )}
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              {isUploading ? 'Subiendo...' : 'Sube la portada del libro'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              JPG, PNG o WEBP (máx 5MB)
            </Typography>
          </Box>
        </label>
      </Box>
    </Box>
  );
}
