import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SvgIcon,
} from '@mui/material';
import { useSnackbar } from '../SnackbarProvider';
import type { BookImageItem } from '../../api/books';

function UploadIcon(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M5 20h14v-2H5v2zm7-18l-5 5h3v4h4v-4h3l-5-5z" />
    </SvgIcon>
  );
}

function DeleteIconCustom(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M6 7h12v12H6V7zm3-4h6v2H9V3zm7 4V5H8v2H5v2h14V7h-3z" />
    </SvgIcon>
  );
}

interface GalleryUploaderProps {
  initialImages?: BookImageItem[];
  onImagesUpload?: (files: File[]) => Promise<void>;
  onImageDelete?: (imageId: number) => Promise<void>;
  disabled?: boolean;
}

export function GalleryUploader({
  initialImages = [],
  onImagesUpload,
  onImageDelete,
  disabled = false,
}: GalleryUploaderProps) {
  const { success, error: showError } = useSnackbar();
  const [images, setImages] = useState<BookImageItem[]>(initialImages);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<number | null>(null);

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validFiles = files.filter((file) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showError(`${file.name} no es un formato válido (JPG, PNG, WEBP)`);
        return false;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        showError(`${file.name} excede 5MB`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    // Preview generation is not required for upload-only behavior.
    validFiles.forEach(() => {});

    if (onImagesUpload) {
      setIsUploading(true);
      try {
        await onImagesUpload(validFiles);
        success(`${validFiles.length} imagen(es) subida(s) exitosamente`);
        // Clear input
        if (event.target) event.target.value = '';
      } catch (err) {
        showError('Error al subir las imágenes');
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDeleteClick = (imageId: number) => {
    setImageToDelete(imageId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (imageToDelete && onImageDelete) {
      try {
        await onImageDelete(imageToDelete);
        setImages((prev) => prev.filter((img) => img.id !== imageToDelete));
        success('Imagen eliminada exitosamente');
      } catch (err) {
        showError('Error al eliminar la imagen');
        console.error(err);
      } finally {
        setDeleteDialogOpen(false);
        setImageToDelete(null);
      }
    }
  };

  return (
    <Box>
      {/* Galería actual */}
      {images.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Imágenes Actuales ({images.length})
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
            {images.map((image) => (
              <Paper
                key={image.id}
                sx={{
                  position: 'relative',
                  paddingBottom: '133.33%',
                  overflow: 'hidden',
                  borderRadius: '8px',
                }}
              >
                  <img
                    src={image.url}
                    alt={`Galería ${image.id}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteClick(image.id)}
                    disabled={disabled}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'rgba(255, 255, 255, 0.9)',
                      '&:hover': { bgcolor: '#f44336', color: 'white' },
                    }}
                  >
                    <DeleteIconCustom fontSize="small" />
                  </IconButton>
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      bottom: 4,
                      left: 4,
                      bgcolor: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: '4px',
                    }}
                  >
                    #{image.displayOrder}
                  </Typography>
                </Paper>
            ))}
          </Box>
        </Box>
      )}

      {/* Upload área */}
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
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          style={{ display: 'none' }}
          id="gallery-input"
        />
        <label htmlFor="gallery-input" style={{ cursor: 'inherit' }}>
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
              {isUploading ? 'Subiendo...' : 'Sube imágenes de galería'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              JPG, PNG o WEBP (máx 5MB cada una)
            </Typography>
          </Box>
        </label>
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          ¿Estás seguro de que deseas eliminar esta imagen de la galería?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
