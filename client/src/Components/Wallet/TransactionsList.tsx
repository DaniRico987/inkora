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

const getStatusChip = (status: WalletTransaction['status']) => {
  switch (status) {
    case 'completed':
      return <Chip label="Completado" color="success" />;
    case 'pending':
      return <Chip label="Pendiente" color="warning" />;
    case 'failed':
      return <Chip label="Fallido" color="error" />;
    default:
      return <Chip label={status} />;
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
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {tx.type === 'purchase' ? 'Compra' : 'Reembolso'}
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                  }).format(tx.amount)}
                </TableCell>
                <TableCell>{getStatusChip(tx.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default TransactionsList;
