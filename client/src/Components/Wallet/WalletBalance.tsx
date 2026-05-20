import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

interface WalletBalanceProps {
  balance: number;
}

const WalletBalance: React.FC<WalletBalanceProps> = ({ balance }) => {
  return (
    <Card
      sx={{
        background:
          'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-skyblue-500) 100%)',
        color: 'white',
        boxShadow: '0 20px 60px rgba(39, 76, 119, 0.3)',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        minHeight: { xs: 180, sm: 220 },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          right: '-50%',
          width: '300px',
          height: '300px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
        },
      }}
    >
      <CardContent
        sx={{ position: 'relative', zIndex: 1, p: { xs: 2.5, sm: 3 } }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 2.5,
            flexWrap: 'wrap',
          }}
        >
          <AttachMoneyIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
          <Typography
            variant="subtitle2"
            sx={{
              opacity: 0.9,
              fontWeight: 600,
              letterSpacing: 0.5,
              fontSize: { xs: '0.72rem', sm: '0.8rem' },
            }}
          >
            SALDO DISPONIBLE
          </Typography>
        </Box>

        <Typography
          variant="h2"
          component="div"
          sx={{
            fontWeight: 800,
            mb: 2.5,
            letterSpacing: '-2px',
            fontSize: { xs: '2rem', sm: '2.8rem', md: '3.5rem' },
            lineHeight: 1.05,
          }}
        >
          {new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(balance)}
        </Typography>

        <Box
          sx={{
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            pt: 2,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              opacity: 0.85,
              display: 'block',
              fontSize: { xs: '0.72rem', sm: '0.78rem' },
            }}
          >
            Fondos disponibles para compras y reservas
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default WalletBalance;
