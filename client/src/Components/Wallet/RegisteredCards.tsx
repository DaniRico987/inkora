import React, { useState } from 'react';
import {
  Box,
  Card,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import type { ClientCard } from '../../api/clients';
import { deleteClientCard } from '../../api/clients';
import { ConfirmationModal } from '../ConfirmationModal';

interface RegisteredCardsProps {
  cards: ClientCard[];
  onCardDeleted: () => void;
}

const RegisteredCards: React.FC<RegisteredCardsProps> = ({
  cards,
  onCardDeleted,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (cardId: number) => {
    setCardToDelete(cardId);
    setDeleteDialogOpen(true);
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
        </Box>
      </Card>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
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
    </Box>
  );
};

export default RegisteredCards;
