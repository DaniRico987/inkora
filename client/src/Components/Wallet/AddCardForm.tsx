import React, { useState } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';
import { addCard } from '../../services/walletService';

interface AddCardFormProps {
  onCardAdded: () => void;
}

const AddCardForm: React.FC<AddCardFormProps> = ({ onCardAdded }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Basic validation
      if (!cardNumber || !expiryDate || !cvv) {
        setError('Todos los campos son requeridos');
        return;
      }
      await addCard({ cardNumber, expiryDate, cvv });
      setCardNumber('');
      setExpiryDate('');
      setCvv('');
      onCardAdded();
      // Aquí podrías mostrar una notificación de éxito
    } catch (err) {
      setError('Error al añadir la tarjeta. Inténtelo de nuevo.');
      console.error(err);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h6" component="h2" gutterBottom>
        Añadir Nueva Tarjeta
      </Typography>
      {error && <Typography color="error">{error}</Typography>}
      <TextField
        margin="normal"
        required
        fullWidth
        id="cardNumber"
        label="Número de Tarjeta"
        name="cardNumber"
        autoComplete="cc-number"
        value={cardNumber}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setCardNumber(e.target.value)
        }
        // Aquí se podría añadir una máscara para el número
      />
      <TextField
        margin="normal"
        required
        fullWidth
        name="expiryDate"
        label="Fecha de Vencimiento (MM/AA)"
        id="expiryDate"
        autoComplete="cc-exp"
        value={expiryDate}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setExpiryDate(e.target.value)
        }
      />
      <TextField
        margin="normal"
        required
        fullWidth
        name="cvv"
        label="CVV"
        type="password"
        id="cvv"
        autoComplete="cc-csc"
        value={cvv}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setCvv(e.target.value)
        }
      />
      <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
        Añadir Tarjeta
      </Button>
    </Box>
  );
};

export default AddCardForm;
