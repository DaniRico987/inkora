import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Paper,
  Typography,
  Alert,
} from '@mui/material';
import type { Store } from '../../interfaces/admin';

interface InventoryItem {
  storeId: number;
  availableQuantity: number;
}

interface InventoryListProps {
  stores: Store[];
  inventory: InventoryItem[];
  onInventoryChange: (storeId: number, quantity: number) => void;
  disabled?: boolean;
  isNew?: boolean;
}

export function InventoryList({
  stores,
  inventory,
  onInventoryChange,
  disabled = false,
  isNew = false,
}: InventoryListProps) {

  const getInventoryQuantity = (storeId: number): number => {
    const item = inventory.find((inv) => inv.storeId === storeId);
    return item?.availableQuantity ?? 0;
  };

  return (
    <Box>
      {isNew && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Al crear el libro, la cantidad se asignará a la primera tienda activa. Puedes editar el inventario después.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 600 }}>Tienda</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Ciudad</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Cantidad Disponible</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stores.map((store) => {
              const storeId = parseInt(store.storeId);
              const quantity = getInventoryQuantity(storeId);

              return (
                <TableRow key={store.storeId} hover>
                  <TableCell>{store.name}</TableCell>
                  <TableCell>{store.city}</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <TextField
                      type="number"
                      size="small"
                      value={quantity}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                        onInventoryChange(storeId, val);
                      }}
                      disabled={disabled}
                      sx={{
                        width: '100px',
                        '& input': { textAlign: 'right' },
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Total de libros: {inventory.reduce((sum, inv) => sum + inv.availableQuantity, 0)}
      </Typography>
    </Box>
  );
}
