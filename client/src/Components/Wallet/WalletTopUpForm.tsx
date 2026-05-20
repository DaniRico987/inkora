import { useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { ClientCard } from '../../api/clients';
import { type WalletTopUpPayload, topUpWallet } from '../../services/walletService';

interface WalletTopUpFormProps {
  cards: ClientCard[];
  onTopUpCompleted: () => void;
}

const formatCardLabel = (card: ClientCard) => {
  const expiry = new Date(card.expirationDate);
  const expiryLabel = Number.isNaN(expiry.getTime())
    ? 'sin vencimiento'
    : expiry.toLocaleDateString('es-CO', { month: '2-digit', year: 'numeric' });

  return `${card.maskedNumber} · ${card.cardType === 'credit' ? 'Crédito' : 'Débito'} · Expira ${expiryLabel}`;
};

const WalletTopUpForm = ({ cards, onTopUpCompleted }: WalletTopUpFormProps) => {
  const [selectedCardId, setSelectedCardId] = useState<number>(cards[0]?.cardId ?? 0);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cards.length === 0) {
      setSelectedCardId(0);
      return;
    }

    setSelectedCardId((currentCardId) => {
      if (currentCardId && cards.some((card) => card.cardId === currentCardId)) {
        return currentCardId;
      }

      return cards[0].cardId;
    });
  }, [cards]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number.parseInt(amount, 10);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setError('Ingresa un monto válido mayor a cero');
      return;
    }

    if (!selectedCardId) {
      setError('Selecciona una tarjeta registrada');
      return;
    }

    try {
      setSubmitting(true);
      const payload: WalletTopUpPayload = {
        amount: parsedAmount,
        cardId: selectedCardId,
      };

      await topUpWallet(payload);
      setAmount('');
      onTopUpCompleted();
    } catch (topUpError) {
      setError(topUpError instanceof Error ? topUpError.message : 'No se pudo recargar el monedero');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" component="h2" gutterBottom>
            Ingresar saldo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Selecciona una tarjeta guardada y define el monto para recargar tu monedero.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {cards.length === 0 ? (
          <Alert severity="info">No tienes tarjetas registradas para hacer una recarga.</Alert>
        ) : (
          <>
            <TextField
              select
              fullWidth
              label="Tarjeta de respaldo"
              value={selectedCardId}
              onChange={(event) => setSelectedCardId(Number(event.target.value))}
            >
              {cards.map((card) => (
                <MenuItem key={card.cardId} value={card.cardId}>
                  {formatCardLabel(card)}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Monto a ingresar"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              slotProps={{
                htmlInput: {
                  min: 1,
                  step: 1,
                  inputMode: 'numeric',
                },
              }}
            />

            <Button type="submit" variant="contained" disabled={submitting} sx={{ alignSelf: 'flex-start' }}>
              {submitting ? 'Procesando...' : 'Recargar saldo'}
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
};

export default WalletTopUpForm;