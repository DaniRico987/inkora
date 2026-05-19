import {
  FormControl,
  FormHelperText,
  FormLabel,
  Chip,
  Stack,
  Paper,
  Typography,
} from '@mui/material';
import type { Category } from '../../interfaces/admin';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategories: number[];
  onSelectionChange: (categoryIds: number[]) => void;
  maxCategories?: number;
  disabled?: boolean;
  error?: string;
}

export function CategorySelector({
  categories,
  selectedCategories,
  onSelectionChange,
  maxCategories = 3,
  disabled = false,
  error,
}: CategorySelectorProps) {
  const handleToggleCategory = (categoryId: number) => {
    if (selectedCategories.includes(categoryId)) {
      onSelectionChange(selectedCategories.filter((id) => id !== categoryId));
    } else if (selectedCategories.length < maxCategories) {
      onSelectionChange([...selectedCategories, categoryId]);
    }
  };

  const selectedCategoryObjects = categories.filter((cat) =>
    selectedCategories.includes(parseInt(cat.categoryId))
  );

  return (
    <FormControl fullWidth error={!!error}>
      <FormLabel sx={{ mb: 2, fontWeight: 600 }}>
        Categorías (máximo {maxCategories}) *
      </FormLabel>

      {/* Selected chips */}
      {selectedCategories.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          {selectedCategoryObjects.map((cat) => (
            <Chip
              key={cat.categoryId}
              label={cat.name}
              onDelete={() => handleToggleCategory(parseInt(cat.categoryId))}
              color="primary"
              variant="filled"
              disabled={disabled}
            />
          ))}
        </Stack>
      )}

      {/* Available categories */}
      <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategories.includes(parseInt(cat.categoryId));
            const isDisabledOption =
              !isSelected && selectedCategories.length >= maxCategories;

            return (
              <Chip
                key={cat.categoryId}
                label={cat.name}
                onClick={() => !isDisabledOption && !disabled && handleToggleCategory(parseInt(cat.categoryId))}
                variant={isSelected ? 'filled' : 'outlined'}
                color={isSelected ? 'primary' : 'default'}
                disabled={isDisabledOption || disabled}
                sx={{
                  cursor: isDisabledOption || disabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabledOption ? 0.5 : 1,
                }}
              />
            );
          })}
        </Stack>
      </Paper>

      {error && (
        <FormHelperText sx={{ mt: 1, color: '#d32f2f' }}>
          {error}
        </FormHelperText>
      )}

      <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
        Selecciona {selectedCategories.length}/{maxCategories} categorías
      </Typography>
    </FormControl>
  );
}
