import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Grid,
  Typography,
} from '@mui/material';
import { getClientProfile, type ClientCard } from '../../api/clients';
import WalletBalance from '../../Components/Wallet/WalletBalance';
import TransactionsList from '../../Components/Wallet/TransactionsList';
import RegisteredCards from '../../Components/Wallet/RegisteredCards';
import WalletTopUpForm from '../../Components/Wallet/WalletTopUpForm';
import { useWallet } from '../../hooks/useWallet';

const WalletPage = () => {
  const { wallet, transactions, loading, error, refetch } = useWallet();
  const [cards, setCards] = useState<ClientCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [cardsError, setCardsError] = useState<string | null>(null);

  const loadCards = async () => {
    try {
      setCardsLoading(true);
      const profile = await getClientProfile();
      setCards(profile.cards);
      setCardsError(null);
    } catch (cardError) {
      setCardsError(
        cardError instanceof Error
          ? cardError.message
          : 'No se pudieron cargar las tarjetas',
      );
    } finally {
      setCardsLoading(false);
    }
  };

  useEffect(() => {
    void loadCards();
  }, []);

  const handleTopUpCompleted = async () => {
    await refetch();
  };

  if (loading || cardsLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          px: 2,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || cardsError) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
        <Alert severity="error">{error ?? cardsError}</Alert>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, var(--color-bg) 0%, var(--color-bg-secondary) 100%)',
        py: { xs: 2, sm: 4 },
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: { xs: 4, sm: 6 } }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              color: 'var(--color-text)',
              mb: 1,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            }}
          >
            Monedero Virtual
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'var(--color-text-muted)',
              mb: { xs: 2, sm: 3 },
              maxWidth: 720,
            }}
          >
            Gestiona tu saldo y realiza recargas rápidas
          </Typography>
        </Box>

        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {wallet && (
            <Grid size={{ xs: 12, md: 5 }}>
              <WalletBalance balance={wallet.balance} />
            </Grid>
          )}
          <Grid size={{ xs: 12, md: 7 }}>
            <WalletTopUpForm
              cards={cards}
              onTopUpCompleted={handleTopUpCompleted}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <RegisteredCards
              cards={cards}
              onCardDeleted={loadCards}
              onCardRegistered={loadCards}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TransactionsList transactions={transactions} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default WalletPage;
