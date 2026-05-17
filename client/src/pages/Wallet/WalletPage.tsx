import {
  Container,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import WalletBalance from '../../Components/Wallet/WalletBalance';
import TransactionsList from '../../Components/Wallet/TransactionsList';
import RegisteredCards from '../../Components/Wallet/RegisteredCards';
import AddCardForm from '../../Components/Wallet/AddCardForm';
import { useWallet } from '../../hooks/useWallet';

const WalletPage = () => {
  const { wallet, transactions, loading, error, refetch } = useWallet();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert severity="error">{error}</Alert>
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
            <AddCardForm onCardAdded={refetch} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Paper className="p-4">
            {wallet && (
              <RegisteredCards cards={wallet.cards} onCardDeleted={refetch} />
            )}
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
