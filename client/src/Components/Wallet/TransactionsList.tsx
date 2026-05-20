import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
} from '@mui/material';
import type { WalletTransaction } from '../../interfaces/wallet';

interface TransactionsListProps {
  transactions: WalletTransaction[];
}

const getTransactionChip = (type: WalletTransaction['transactionType']) => {
  switch (type) {
    case 'payment':
      return <Chip label="Pago" color="error" variant="outlined" />;
    case 'refund':
      return <Chip label="Reembolso" color="success" variant="outlined" />;
    case 'topUp':
      return <Chip label="Recarga" color="primary" variant="outlined" />;
    default:
      return <Chip label={type} />;
  }
};

const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
}) => {
  return (
    <>
      <Typography variant="h6" component="h2" gutterBottom>
        Historial de Transacciones
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Monto</TableCell>
              <TableCell>Saldo después</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No hay movimientos registrados todavía.
                </TableCell>
              </TableRow>
            )}
            {transactions.map((tx) => (
              <TableRow key={tx.transactionId}>
                <TableCell>{new Date(tx.transactionDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  {getTransactionChip(tx.transactionType)}
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                  }).format(tx.amount)}
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                  }).format(tx.balanceAfter)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default TransactionsList;
