import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import type { ClientCard, ClientCardType } from '../../api/clients';
import { createClientCard, deleteClientCard } from '../../api/clients';
import { ConfirmationModal } from '../ConfirmationModal';
import WalletExpirationPicker from './WalletExpirationPicker';
import {
  formatCardNumberInput,
  maskCardNumber,
  normalizeCardNumber,
} from '../../utils/cardNumber';

interface RegisteredCardsProps {
  cards: ClientCard[];
  onCardDeleted: () => void;
  onCardRegistered: () => void;
}

type CreateCardFormState = {
  cardNumber: string;
  cardType: ClientCardType;
  expirationDate: string;
  cardHolder: string;
};

const initialCreateCardForm: CreateCardFormState = {
  cardNumber: '',
  cardType: 'credit',
  expirationDate: '',
  cardHolder: '',
};

const RegisteredCards: React.FC<RegisteredCardsProps> = ({
  cards,
  onCardDeleted,
  onCardRegistered,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateCardFormState>(
    initialCreateCardForm,
  );

  const handleDeleteClick = (cardId: number) => {
    setCardToDelete(cardId);
    setDeleteDialogOpen(true);
  };

  const handleOpenCreateDialog = () => {
    setCreateError(null);
    setCreateForm(initialCreateCardForm);
    setCreateDialogOpen(true);
  };

  const handleCreateCardChange = <K extends keyof CreateCardFormState>(
    field: K,
    value: CreateCardFormState[K],
  ) => {
    setCreateForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreateCard = async () => {
    const normalizedNumber = normalizeCardNumber(createForm.cardNumber);

    if (normalizedNumber.length < 4) {
      setCreateError('Ingresa un número de tarjeta válido');
      return;
    }

    if (createForm.cardHolder.trim().length < 3) {
      setCreateError('Ingresa el nombre como figura en la tarjeta');
      return;
    }

    if (!createForm.expirationDate) {
      setCreateError('Selecciona la fecha de expiración');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      await createClientCard({
        maskedNumber: maskCardNumber(normalizedNumber),
        cardType: createForm.cardType,
        expirationDate: createForm.expirationDate,
        cardHolder: createForm.cardHolder.trim(),
      });

      setCreateDialogOpen(false);
      setCreateForm(initialCreateCardForm);
      onCardRegistered();
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la tarjeta',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (cardToDelete === null) return;

    try {
      setDeleting(true);
      await deleteClientCard(cardToDelete);
      setDeleteDialogOpen(false);
      setCardToDelete(null);
      onCardDeleted();
    } catch (error) {
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  const formatExpiry = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Sin vencimiento';
    }

    return date.toLocaleDateString('es-CO', {
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (cards.length === 0) {
    return (
      <>
        <Card
          sx={{
            background: 'var(--color-bg-secondary)',
            borderRadius: 3,
            p: { xs: 2, sm: 3 },
            border: '1px solid var(--color-border)',
          }}
        >
          <Box sx={{ textAlign: 'center', py: { xs: 2, sm: 3 } }}>
            <CreditCardIcon
              sx={{
                fontSize: { xs: 40, sm: 48 },
                color: 'var(--color-text-muted)',
                mb: 2,
                opacity: 0.5,
              }}
            />
            <Typography variant="h6" sx={{ color: 'var(--color-text)' }}>
              Tarjetas Registradas
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'var(--color-text-muted)',
                mt: 1,
              }}
            >
              No tienes tarjetas registradas todavía
            </Typography>
            <Button
              onClick={handleOpenCreateDialog}
              variant="contained"
              sx={{
                mt: 3,
                borderRadius: 2,
                textTransform: 'none',
                backgroundColor: 'var(--color-primary-500)',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: 'var(--color-primary-600)',
                },
              }}
            >
              Registrar tarjeta
            </Button>
          </Box>
        </Card>

        <Dialog
          open={createDialogOpen}
          onClose={() => !creating && setCreateDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Registrar tarjeta</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {createError && <Alert severity="error">{createError}</Alert>}
              <TextField
                label="Número de tarjeta"
                value={createForm.cardNumber}
                onChange={(event) =>
                  handleCreateCardChange(
                    'cardNumber',
                    formatCardNumberInput(event.target.value),
                  )
                }
                placeholder="1234 5678 9012 3456"
                helperText="Se guardará en formato enmascarado"
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel id="create-card-type-label">Tipo de tarjeta</InputLabel>
                <Select
                  labelId="create-card-type-label"
                  label="Tipo de tarjeta"
                  value={createForm.cardType}
                  onChange={(event) =>
                    handleCreateCardChange(
                      'cardType',
                      event.target.value as ClientCardType,
                    )
                  }
                >
                  <MenuItem value="credit">Crédito</MenuItem>
                  <MenuItem value="debit">Débito</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Nombre del titular"
                value={createForm.cardHolder}
                onChange={(event) =>
                  handleCreateCardChange('cardHolder', event.target.value)
                }
                fullWidth
              />
              <WalletExpirationPicker
                label="Fecha de expiración"
                value={createForm.expirationDate}
                onChange={(event) =>
                  handleCreateCardChange('expirationDate', event.target.value)
                }
                helperText="Selecciona mes y año"
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
              sx={{ textTransform: 'none' }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCard}
              variant="contained"
              disabled={creating}
              sx={{ textTransform: 'none' }}
            >
              {creating ? 'Registrando...' : 'Registrar tarjeta'}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{
                color: 'var(--color-text)',
                fontWeight: 700,
                mb: 1,
              }}
            >
              Tarjetas Registradas
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'var(--color-text-muted)',
                fontSize: { xs: '0.82rem', sm: '0.875rem' },
              }}
            >
              {cards.length} tarjeta{cards.length !== 1 ? 's' : ''} disponible
              {cards.length !== 1 ? 's' : ''}
            </Typography>
          </Box>

          <Button
            onClick={handleOpenCreateDialog}
            variant="outlined"
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              borderColor: 'var(--color-primary-500)',
              color: 'var(--color-primary-500)',
              '&:hover': {
                borderColor: 'var(--color-primary-600)',
                backgroundColor: 'rgba(39, 76, 119, 0.06)',
              },
            }}
          >
            Registrar tarjeta
          </Button>
        </Box>
      </Box>

      <Stack spacing={{ xs: 1.5, sm: 2.5 }}>
        {cards.map((card) => (
          <Card
            key={card.cardId}
            sx={{
              background:
                'linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-surface) 100%)',
              border: '1px solid var(--color-border)',
              borderRadius: 3,
              p: { xs: 2, sm: 2.5 },
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                borderColor: 'var(--color-primary-500)',
              },
              position: 'relative',
              display: 'flex',
              alignItems: { xs: 'stretch', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 2 },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2.5 },
                flex: 1,
                minWidth: 0,
              }}
            >
              <CreditCardIcon
                sx={{
                  fontSize: { xs: 32, sm: 40 },
                  color: 'var(--color-primary-500)',
                  opacity: 0.8,
                }}
              />
              <Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    mb: 0.5,
                    letterSpacing: 2,
                    wordBreak: 'break-word',
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                  }}
                >
                  {card.maskedNumber}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    mb: 0.5,
                    flexWrap: 'wrap',
                  }}
                >
                  <Chip
                    label={card.cardType === 'credit' ? 'Crédito' : 'Débito'}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 24,
                      fontSize: '0.75rem',
                      color:
                        card.cardType === 'credit'
                          ? 'var(--color-primary-500)'
                          : 'var(--color-skyblue-500)',
                    }}
                  />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'var(--color-text-muted)',
                    display: 'block',
                    wordBreak: 'break-word',
                    fontSize: { xs: '0.72rem', sm: '0.78rem' },
                  }}
                >
                  {card.cardHolder} • Expira {formatExpiry(card.expirationDate)}
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Eliminar tarjeta">
              <IconButton
                size="small"
                onClick={() => handleDeleteClick(card.cardId)}
                sx={{
                  color: 'var(--color-danger-500)',
                  alignSelf: { xs: 'flex-end', sm: 'center' },
                  '&:hover': {
                    background: 'rgba(239, 68, 68, 0.1)',
                  },
                }}
              >
                <DeleteIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </Card>
        ))}
      </Stack>

      <ConfirmationModal
        isOpen={deleteDialogOpen}
        title="Eliminar tarjeta"
        message="¿Estás seguro de que deseas eliminar esta tarjeta? Esta acción no se puede deshacer."
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        confirmText={deleting ? 'Eliminando...' : 'Eliminar'}
        cancelText="Cancelar"
        isConfirmLoading={deleting}
        closeOnBackdropClick={!deleting}
      />

      <Dialog
        open={createDialogOpen}
        onClose={() => !creating && setCreateDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Registrar tarjeta</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <TextField
              label="Número de tarjeta"
              value={createForm.cardNumber}
              onChange={(event) =>
                handleCreateCardChange(
                  'cardNumber',
                  formatCardNumberInput(event.target.value),
                )
              }
              placeholder="1234 5678 9012 3456"
              helperText="Se guardará en formato enmascarado"
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel id="create-card-type-label">Tipo de tarjeta</InputLabel>
              <Select
                labelId="create-card-type-label"
                label="Tipo de tarjeta"
                value={createForm.cardType}
                onChange={(event) =>
                  handleCreateCardChange(
                    'cardType',
                    event.target.value as ClientCardType,
                  )
                }
              >
                <MenuItem value="credit">Crédito</MenuItem>
                <MenuItem value="debit">Débito</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Nombre del titular"
              value={createForm.cardHolder}
              onChange={(event) =>
                handleCreateCardChange('cardHolder', event.target.value)
              }
              fullWidth
            />
            <WalletExpirationPicker
              label="Fecha de expiración"
              value={createForm.expirationDate}
              onChange={(event) =>
                handleCreateCardChange('expirationDate', event.target.value)
              }
              helperText="Selecciona mes y año"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setCreateDialogOpen(false)}
            disabled={creating}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreateCard}
            variant="contained"
            disabled={creating}
            sx={{ textTransform: 'none' }}
          >
            {creating ? 'Registrando...' : 'Registrar tarjeta'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RegisteredCards;
