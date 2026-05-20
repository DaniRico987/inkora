import React from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  IconButton,
  SvgIcon,
} from '@mui/material';
import type { ClientCard } from '../../api/clients';
import { deleteClientCard } from '../../api/clients';

function DeleteIconCustom(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M6 7h12v12H6V7zm3-4h6v2H9V3zm7 4V5H8v2H5v2h14V7h-3z" />
    </SvgIcon>
  );
}

interface RegisteredCardsProps {
  cards: ClientCard[];
  onCardDeleted: () => void;
}

const RegisteredCards: React.FC<RegisteredCardsProps> = ({
  cards,
  onCardDeleted,
}) => {
  const handleDelete = async (cardId: number) => {
    try {
      await deleteClientCard(cardId);
      onCardDeleted();
    } catch (error) {
      console.error(error);
    }
  };

  const formatExpiry = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Sin vencimiento';
    }

    return date.toLocaleDateString('es-CO', { month: '2-digit', year: 'numeric' });
  };

  return (
    <Box>
      <Typography variant="h6" component="h2" gutterBottom>
        Tarjetas Registradas
      </Typography>
      <Stack spacing={2}>
        {cards.map((card) => (
          <Paper
            key={card.cardId}
            variant="outlined"
            sx={{ position: 'relative', p: 2.5, pr: 7, borderRadius: 3 }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {card.maskedNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {card.cardType === 'credit' ? 'Crédito' : 'Débito'} · Expira {formatExpiry(card.expirationDate)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {card.cardHolder}
            </Typography>
            <IconButton
              size="small"
              aria-label="Eliminar tarjeta"
              onClick={() => handleDelete(card.cardId)}
              sx={{ position: 'absolute', right: 10, bottom: 10, color: 'error.main' }}
            >
              <DeleteIconCustom fontSize="small" />
            </IconButton>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

export default RegisteredCards;
