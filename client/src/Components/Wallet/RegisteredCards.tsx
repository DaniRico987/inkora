import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { PaymentMethod } from '../../interfaces/wallet';
import { deleteCard } from '../../services/walletService';

interface RegisteredCardsProps {
  cards: PaymentMethod[];
  onCardDeleted: () => void;
}

const RegisteredCards: React.FC<RegisteredCardsProps> = ({
  cards,
  onCardDeleted,
}) => {
  const handleDelete = async (cardId: string) => {
    try {
      await deleteCard(cardId);
      onCardDeleted();
    } catch (error) {
      console.error(error);
      // Aquí podrías mostrar una notificación de error
    }
  };

  return (
    <>
      <Typography variant="h6" component="h2" gutterBottom>
        Tarjetas Registradas
      </Typography>
      <Paper>
        <List>
          {cards.map((card) => (
            <ListItem
              key={card.id}
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDelete(card.id)}
                >
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={`**** **** **** ${card.last4}`}
                secondary={card.brand}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </>
  );
};

export default RegisteredCards;
