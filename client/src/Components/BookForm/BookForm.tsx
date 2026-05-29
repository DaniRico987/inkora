import { useState, useEffect, type FormEvent } from 'react';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Paper,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useSnackbar } from '../SnackbarProvider';
import { CoverUploader } from './CoverUploader';
import { GalleryUploader } from './GalleryUploader';
import { CategorySelector } from './CategorySelector';
import { InventoryList } from './InventoryList';
import type { BookDetailItem } from '../../api/books';
import {
  uploadBookGallery,
  deleteBookGalleryImage,
} from '../../api/books';
import type { Store, Category } from '../../interfaces/admin';

const CURRENT_YEAR = new Date().getFullYear();

const BOOK_LANGUAGE_OPTIONS = [
  'Inglés',
  'Español',
  'Portugués',
  'Francés',
  'Alemán',
  'Italiano',
  'Neerlandés',
  'Sueco',
  'Polaco',
  'Griego',
  'Chino',
  'Japonés',
  'Ruso',
];

const BOOK_CONDITIONS = [
  { value: 'new', label: 'Nuevo' },
  { value: 'used', label: 'Usado' },
];

interface BookFormProps {
  initialData?: BookDetailItem;
  stores: Store[];
  categories: Category[];
  isLoading?: boolean;
  onSubmit: (
    data: {
      title: string;
      author: string;
      publicationYear?: number;
      publisher?: string;
      isbn?: string;
      language?: string;
      pageCount?: number;
      price: number;
      condition?: 'new' | 'used';
      isAvailable?: boolean;
      description?: string;
      coverUrl?: string;
      previewUrl?: string;
      categoryIds: number[];
      initialInventoryQuantity?: number;
    },
    inventoryItems: InventoryItem[],
    galleryFiles: File[],
    coverFile: File | null,
  ) => Promise<string | void>;
  onCancel?: () => void;
}

interface ValidationErrors {
  [key: string]: string;
}

interface InventoryItem {
  storeId: number;
  availableQuantity: number;
}

export function BookForm({
  initialData,
  stores,
  categories,
  isLoading = false,
  onSubmit,
  onCancel,
}: BookFormProps) {
  const { error: showError } = useSnackbar();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    publicationYear: '',
    publisher: '',
    isbn: '',
    language: '',
    pageCount: '',
    price: '',
    condition: 'new' as 'new' | 'used',
    isAvailable: true,
    description: '',
    coverUrl: '',
    previewUrl: '',
  });

  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [pendingGalleryFiles, setPendingGalleryFiles] = useState<File[]>([]);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        author: initialData.author || '',
        publicationYear: initialData.publicationYear?.toString() || '',
        publisher: initialData.publisher || '',
        isbn: initialData.isbn || '',
        language: initialData.language || '',
        pageCount: initialData.pageCount?.toString() || '',
        price: initialData.price?.toString() || '',
        condition: (initialData.status as 'new' | 'used') || 'new',
        isAvailable: initialData.isAvailable ?? true,
        description: initialData.description || '',
        coverUrl: initialData.coverUrl || '',
        previewUrl: initialData.preview || '',
      });
      setSelectedCategories(initialData.categories.map((c) => c.id));
      
      const existingInventory = initialData.inventoriesByStore || [];
      const mergedInventory = stores.map((store) => {
        const sId = parseInt(store.storeId, 10);
        const existing = existingInventory.find((inv) => inv.storeId === sId);
        return {
          storeId: sId,
          availableQuantity: existing ? existing.availableQuantity : 0,
        };
      });
      setInventory(mergedInventory);
    } else {
      // Initialize inventory with all stores
      setInventory(stores.map((store) => ({ storeId: parseInt(store.storeId, 10), availableQuantity: 0 })));
    }

    setPendingGalleryFiles([]);
    setPendingCoverFile(null);
  }, [initialData, stores]);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!formData.title.trim()) {
      errors.title = 'El título es obligatorio';
    }

    if (!formData.author.trim()) {
      errors.author = 'El autor es obligatorio';
    }

    if (!formData.description.trim()) {
      errors.description = 'La descripción es obligatoria';
    }

    const priceNum = parseFloat(formData.price);
    if (!formData.price || priceNum <= 0) {
      errors.price = 'El precio debe ser mayor a 0';
    }

    if (formData.isbn) {
      const isbnDigits = formData.isbn.replace(/\D/g, '');
      if (isbnDigits.length !== 13) {
        errors.isbn = 'El ISBN debe tener exactamente 13 dígitos';
      }
    }

    if (formData.publicationYear) {
      const year = parseInt(formData.publicationYear, 10);
      if (year < 1000 || year > CURRENT_YEAR) {
        errors.publicationYear = `El año debe estar entre 1000 y ${CURRENT_YEAR}`;
      }
    }

    if (formData.pageCount) {
      const pages = parseInt(formData.pageCount, 10);
      if (pages <= 0) {
        errors.pageCount = 'El número de páginas debe ser mayor a 0';
      }
    }

    if (selectedCategories.length === 0) {
      errors.categories = 'Selecciona al menos 1 categoría';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleInventoryChange = (storeId: number, quantity: number) => {
    setInventory((prev) =>
      prev.map((inv) =>
        inv.storeId === storeId ? { ...inv, availableQuantity: quantity } : inv
      )
    );
  };

  const handleCoverFileSelect = async (file: File) => {
    setPendingCoverFile(file);
  };

  const handleGalleryFileSelect = async (files: File[]) => {
    setPendingGalleryFiles((prev) => [...prev, ...files]);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Por favor corrige los errores en el formulario');
      return;
    }

    const inventoryItems = inventory;
    const totalInventory = inventoryItems.reduce((sum, item) => sum + item.availableQuantity, 0);
    if (!initialData && totalInventory === 0) {
      showError('Por favor asigna al menos una cantidad de inventario');
      setValidationErrors((prev) => ({
        ...prev,
        inventory: 'Asigna al menos una cantidad de inventario para continuar',
      }));
      return;
    }

    // Validation: only allow increasing stock (no decrease) when editing
    if (initialData) {
      for (const item of inventoryItems) {
        const prevItem = initialData.inventoriesByStore.find((inv) => inv.storeId === item.storeId);
        const prevQty = prevItem ? prevItem.availableQuantity : 0;
        if (item.availableQuantity < prevQty) {
          const storeName = stores.find((s) => parseInt(s.storeId, 10) === item.storeId)?.name || `Tienda ${item.storeId}`;
          showError(`No se puede disminuir la cantidad en la tienda "${storeName}". Solo se permite incrementar.`);
          setValidationErrors((prev) => ({
            ...prev,
            inventory: `Solo se permite incrementar la cantidad en "${storeName}", no disminuirla`,
          }));
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        publicationYear: formData.publicationYear ? parseInt(formData.publicationYear, 10) : undefined,
        publisher: formData.publisher.trim() || undefined,
        isbn: formData.isbn.replace(/\D/g, '') || undefined,
        language: formData.language || undefined,
        pageCount: formData.pageCount ? parseInt(formData.pageCount, 10) : undefined,
        price: parseFloat(formData.price),
        condition: formData.condition as 'new' | 'used',
        isAvailable: formData.isAvailable,
        description: formData.description.trim(),
        coverUrl: pendingCoverFile ? undefined : formData.coverUrl || undefined,
        previewUrl: formData.previewUrl || undefined,
        categoryIds: selectedCategories,
        initialInventoryQuantity: initialData ? undefined : Math.max(totalInventory, 1),
      };

      await onSubmit(submitData, inventoryItems, pendingGalleryFiles, pendingCoverFile);
    } catch (err) {
      console.error('Error submitting form:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Paper sx={{ p: 3, mb: 3 }}>
        {/* Título */}
        <Typography variant="h6" sx={{ mb: 2 }}>
          Información General
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
          <Box>
            <TextField
              fullWidth
              label="Título *"
              value={formData.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              error={!!validationErrors.title}
              helperText={validationErrors.title}
              disabled={isLoading || isSubmitting}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              label="Autor *"
              value={formData.author}
              onChange={(e) => handleFieldChange('author', e.target.value)}
              error={!!validationErrors.author}
              helperText={validationErrors.author}
              disabled={isLoading || isSubmitting}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              label="Precio *"
              type="number"
              value={formData.price}
              onChange={(e) => handleFieldChange('price', e.target.value)}
              error={!!validationErrors.price}
              helperText={validationErrors.price}
              disabled={isLoading || isSubmitting}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              label="Descripción *"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              error={!!validationErrors.description}
              helperText={validationErrors.description}
              disabled={isLoading || isSubmitting}
            />
          </Box>
        </Box>

        {/* Detalles adicionales */}
        <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>
          Detalles Adicionales
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
          <Box>
            <TextField
              fullWidth
              label="ISBN"
              placeholder="1234567890123"
              value={formData.isbn}
              onChange={(e) => handleFieldChange('isbn', e.target.value.replace(/\D/g, '').slice(0, 13))}
              error={!!validationErrors.isbn}
              helperText={validationErrors.isbn || '13 dígitos'}
              disabled={isLoading || isSubmitting}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              label="Editorial"
              value={formData.publisher}
              onChange={(e) => handleFieldChange('publisher', e.target.value)}
              disabled={isLoading || isSubmitting}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              label="Año de Publicación"
              type="number"
              value={formData.publicationYear}
              onChange={(e) => handleFieldChange('publicationYear', e.target.value)}
              error={!!validationErrors.publicationYear}
              helperText={validationErrors.publicationYear}
              disabled={isLoading || isSubmitting}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              label="Número de Páginas"
              type="number"
              value={formData.pageCount}
              onChange={(e) => handleFieldChange('pageCount', e.target.value)}
              error={!!validationErrors.pageCount}
              helperText={validationErrors.pageCount}
              disabled={isLoading || isSubmitting}
            />
          </Box>

          <Box>
            <Select
              fullWidth
              value={formData.language}
              onChange={(e) => handleFieldChange('language', e.target.value)}
              displayEmpty
              disabled={isLoading || isSubmitting}
            >
              <MenuItem value="">
                <em>Selecciona idioma</em>
              </MenuItem>
              {BOOK_LANGUAGE_OPTIONS.map((lang) => (
                <MenuItem key={lang} value={lang}>
                  {lang}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box>
            <Select
              fullWidth
              value={formData.condition}
              onChange={(e) => handleFieldChange('condition', e.target.value)}
              disabled={isLoading || isSubmitting}
            >
              {BOOK_CONDITIONS.map((cond) => (
                <MenuItem key={cond.value} value={cond.value}>
                  {cond.label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box sx={{ gridColumn: '1 / -1' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isAvailable}
                  onChange={(e) => handleFieldChange('isAvailable', e.target.checked)}
                  disabled={isLoading || isSubmitting}
                />
              }
              label="Disponible en catálogo"
            />
          </Box>
        </Box>

        {/* Categorías */}
        <Box sx={{ mb: 3 }}>
          <CategorySelector
            categories={categories}
            selectedCategories={selectedCategories}
            onSelectionChange={setSelectedCategories}
            maxCategories={3}
            disabled={isLoading || isSubmitting}
            error={validationErrors.categories}
          />
        </Box>
      </Paper>

      {/* Portada */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Portada
        </Typography>
        <CoverUploader
          bookId={initialData?.id}
          initialCoverUrl={formData.coverUrl}
          onCoverChange={(url) => handleFieldChange('coverUrl', url)}
          onCoverUpload={initialData ? undefined : handleCoverFileSelect}
          disabled={isLoading || isSubmitting}
        />
      </Paper>

      {/* Galería */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Galería de Imágenes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {initialData
            ? 'Sube nuevas imágenes para la galería o elimina las existentes.'
            : 'Las imágenes se subirán después de crear el libro.'}
        </Typography>
        <GalleryUploader
          initialImages={initialData?.images || []}
          onImagesUpload={async (files) => {
            if (initialData) {
              await uploadBookGallery(initialData.id.toString(), files);
            } else {
              await handleGalleryFileSelect(files);
            }
          }}
          onImageDelete={initialData ? async (imageId) => {
            await deleteBookGalleryImage(initialData.id.toString(), imageId);
          } : undefined}
          disabled={isLoading || isSubmitting}
        />
        {!initialData && pendingGalleryFiles.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            {pendingGalleryFiles.length} imagen(es) listas para subir al crear el libro.
          </Typography>
        )}
      </Paper>

      {/* Inventario */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Inventario por Tienda
        </Typography>
        <InventoryList
          stores={stores}
          inventory={inventory}
          onInventoryChange={handleInventoryChange}
          disabled={isLoading || isSubmitting}
          isNew={!initialData}
        />
      </Paper>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={isLoading || isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          type="submit"
          disabled={isLoading || isSubmitting}
          startIcon={isSubmitting && <CircularProgress size={20} />}
        >
          {initialData ? 'Actualizar Libro' : 'Crear Libro'}
        </Button>
      </Box>
    </Box>
  );
}
