import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Paper,
  SvgIcon,
} from '@mui/material';
import type { PaymentMethod } from '../../interfaces/wallet';
import { deleteCard } from '../../services/walletService';

function DeleteIconCustom(props: any) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M6 7h12v12H6V7zm3-4h6v2H9V3zm7 4V5H8v2H5v2h14V7h-3z" />
    </SvgIcon>
  );
}

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
                  <DeleteIconCustom />
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
