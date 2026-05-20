import { useEffect, useState } from 'react';
import {
  Alert,
  CircularProgress,
  Container,
  Grid,
  Paper,
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
      setCardsError(cardError instanceof Error ? cardError.message : 'No se pudieron cargar las tarjetas');
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
      <div className="flex justify-center items-center h-screen">
        <CircularProgress />
      </div>
    );
  }

  if (error || cardsError) {
    return (
      <div className="p-4">
        <Alert severity="error">{error ?? cardsError}</Alert>
      </div>
    );
  }

  return (
    <Container maxWidth="lg" className="py-8">
      <Typography variant="h4" component="h1" gutterBottom>
        Monedero Virtual
      </Typography>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          {wallet && (
            <Paper className="p-4">
              <WalletBalance balance={wallet.balance} />
            </Paper>
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper className="p-4">
            <WalletTopUpForm cards={cards} onTopUpCompleted={handleTopUpCompleted} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Paper className="p-4">
            <RegisteredCards cards={cards} onCardDeleted={loadCards} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Paper className="p-4">
            <TransactionsList transactions={transactions} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default WalletPage;
