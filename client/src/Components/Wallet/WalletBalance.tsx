import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

interface WalletBalanceProps {
  balance: number;
}

const WalletBalance: React.FC<WalletBalanceProps> = ({ balance }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          Saldo Disponible
        </Typography>
        <Typography variant="h4" component="p">
          {new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
          }).format(balance)}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default WalletBalance;
