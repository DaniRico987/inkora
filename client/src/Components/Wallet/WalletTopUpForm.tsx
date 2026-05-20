import { useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  MenuItem,
  Stack,
  TextField,
  Typography,
  InputAdornment,
} from '@mui/material';
import AddCardIcon from '@mui/icons-material/AddCard';
import SendIcon from '@mui/icons-material/Send';
import type { ClientCard } from '../../api/clients';
import {
  type WalletTopUpPayload,
  topUpWallet,
} from '../../services/walletService';

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
  const [selectedCardId, setSelectedCardId] = useState<number>(
    cards[0]?.cardId ?? 0,
  );
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cards.length === 0) {
      setSelectedCardId(0);
      return;
    }

    setSelectedCardId((currentCardId) => {
      if (
        currentCardId &&
        cards.some((card) => card.cardId === currentCardId)
      ) {
        return currentCardId;
      }

      return cards[0].cardId;
    });
  }, [cards]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

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
      setSuccessMessage(
        `¡Recarga exitosa! Se ingresaron ${new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
        }).format(parsedAmount)}`,
      );
      setAmount('');
      setTimeout(() => {
        onTopUpCompleted();
        setSuccessMessage(null);
      }, 1500);
    } catch (topUpError) {
      setError(
        topUpError instanceof Error
          ? topUpError.message
          : 'No se pudo recargar el monedero',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (cards.length === 0) {
    return (
      <Card
        sx={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          borderRadius: 3,
          p: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <AddCardIcon
            sx={{
              fontSize: 48,
              color: 'var(--color-text-muted)',
              mb: 2,
              opacity: 0.5,
            }}
          />
          <Typography variant="h6" sx={{ color: 'var(--color-text)', mb: 1 }}>
            Ingresar saldo
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-muted)' }}>
            Necesitas registrar una tarjeta para hacer recargas
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 3,
        p: { xs: 2, sm: 3 },
      }}
    >
      <Stack spacing={{ xs: 2, sm: 2.5 }}>
        <Box>
          <Typography
            variant="h6"
            sx={{
              color: 'var(--color-text)',
              fontWeight: 700,
              mb: 0.5,
            }}
          >
            Ingresar saldo
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-text-muted)' }}>
            Recarga tu monedero de forma rápida y segura
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            {successMessage}
          </Alert>
        )}

        <TextField
          select
          fullWidth
          label="Seleccionar tarjeta"
          value={selectedCardId || ''}
          onChange={(event) => setSelectedCardId(Number(event.target.value))}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              color: 'var(--color-text)',
              backgroundColor: 'var(--color-bg-secondary)',
            },
            '& .MuiInputLabel-root': {
              color: 'var(--color-text-muted)',
            },
            '& .MuiInputBase-input': {
              color: 'var(--color-text)',
            },
            '& .MuiSelect-select': {
              color: 'var(--color-text)',
            },
            '& .MuiSvgIcon-root': {
              color: 'var(--color-text-muted)',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-border)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-primary-500)',
            },
            '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-primary-500)',
            },
          }}
        >
          {cards.map((card) => (
            <MenuItem key={card.cardId} value={card.cardId}>
              {formatCardLabel(card)}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          label="Monto a recargar"
          placeholder="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          type="number"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Typography
                    sx={{ color: 'var(--color-text-muted)', fontWeight: 600 }}
                  >
                    $
                  </Typography>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Typography
                    sx={{
                      color: 'var(--color-text-muted)',
                      fontSize: '0.875rem',
                    }}
                  >
                    COP
                  </Typography>
                </InputAdornment>
              ),
            },
            htmlInput: {
              min: 1,
              step: 1,
              inputMode: 'numeric',
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              color: 'var(--color-text)',
              backgroundColor: 'var(--color-bg-secondary)',
            },
            '& .MuiInputLabel-root': {
              color: 'var(--color-text-muted)',
            },
            '& .MuiInputBase-input': {
              color: 'var(--color-text)',
            },
            '& input[type=number]': {
              color: 'var(--color-text)',
              MozAppearance: 'textfield',
            },
            '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button':
              {
                WebkitAppearance: 'none',
                margin: 0,
              },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-border)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-primary-500)',
            },
            '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-primary-500)',
            },
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={submitting || !amount || !selectedCardId}
          endIcon={<SendIcon />}
          sx={{
            alignSelf: { xs: 'stretch', sm: 'flex-start' },
            width: { xs: '100%', sm: 'auto' },
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: 2,
            textTransform: 'none',
            backgroundColor: 'var(--color-primary-500)',
            color: '#ffffff',
            boxShadow: '0 12px 30px rgba(39, 76, 119, 0.28)',
            '&:hover': {
              backgroundColor: 'var(--color-primary-600)',
              boxShadow: '0 14px 34px rgba(39, 76, 119, 0.34)',
            },
            '&.Mui-disabled': {
              backgroundColor: 'var(--color-primary-500)',
              color: '#ffffff',
              opacity: 0.7,
            },
          }}
        >
          {submitting ? 'Procesando recarga...' : 'Recargar ahora'}
        </Button>
      </Stack>
    </Card>
  );
};

export default WalletTopUpForm;
