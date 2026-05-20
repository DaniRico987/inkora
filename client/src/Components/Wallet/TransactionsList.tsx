import React from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  TablePagination,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import type { WalletTransaction } from '../../interfaces/wallet';

type TransactionInfo = {
  label: string;
  color: 'error' | 'success' | 'primary' | 'default';
  icon: string;
};

interface TransactionsListProps {
  transactions: WalletTransaction[];
}

const getTransactionInfo = (
  type: WalletTransaction['transactionType'],
): TransactionInfo => {
  switch (type) {
    case 'payment':
      return { label: 'Pago', color: 'error', icon: '↓' };
    case 'refund':
      return { label: 'Reembolso', color: 'success', icon: '↑' };
    case 'topUp':
      return { label: 'Recarga', color: 'primary', icon: '↑' };
    default:
      return { label: type, color: 'default', icon: '•' };
  }
};

const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
}) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const displayedTransactions = transactions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  return (
    <Card
      sx={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <HistoryIcon
            sx={{
              color: 'var(--color-primary-500)',
              fontSize: { xs: 24, sm: 28 },
            }}
          />
          <Box>
            <Typography
              variant="h6"
              sx={{
                color: 'var(--color-text)',
                fontWeight: 700,
                fontSize: { xs: '1rem', sm: '1.25rem' },
              }}
            >
              Historial de Transacciones
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'var(--color-text-muted)',
                fontSize: { xs: '0.72rem', sm: '0.78rem' },
              }}
            >
              {transactions.length} movimiento
              {transactions.length !== 1 ? 's' : ''} en total
            </Typography>
          </Box>
        </Box>
      </Box>

      {transactions.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: { xs: 4, sm: 6 }, px: 2 }}>
          <HistoryIcon
            sx={{
              fontSize: { xs: 48, sm: 64 },
              color: 'var(--color-text-muted)',
              mb: 2,
              opacity: 0.3,
            }}
          />
          <Typography
            variant="body1"
            sx={{
              color: 'var(--color-text-muted)',
            }}
          >
            No hay movimientos registrados todavía
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: 'var(--color-surface)',
                    '& th': {
                      backgroundColor: 'var(--color-surface)',
                      borderBottom: '2px solid var(--color-border)',
                      color: 'var(--color-text)',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    },
                  }}
                >
                  <TableCell sx={{ width: '25%' }}>Fecha</TableCell>
                  <TableCell sx={{ width: '25%' }}>Tipo</TableCell>
                  <TableCell align="right" sx={{ width: '25%' }}>
                    Monto
                  </TableCell>
                  <TableCell align="right" sx={{ width: '25%' }}>
                    Saldo
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedTransactions.map((tx) => {
                  const info = getTransactionInfo(tx.transactionType);
                  return (
                    <TableRow
                      key={tx.transactionId}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'var(--color-surface)',
                        },
                        borderBottom: '1px solid var(--color-border)',
                        '& td': {
                          color: 'var(--color-text)',
                          padding: { xs: '10px 12px', sm: '12px 16px' },
                          whiteSpace: 'nowrap',
                        },
                      }}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                        >
                          {new Date(tx.transactionDate).toLocaleDateString(
                            'es-CO',
                            {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            },
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={info.label}
                          color={info.color}
                          variant="outlined"
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: '0.75rem',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color:
                              tx.transactionType === 'topUp' ||
                              tx.transactionType === 'refund'
                                ? 'var(--color-danger-500)'
                                : 'var(--color-text)',
                            fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          }}
                        >
                          {tx.transactionType === 'topUp' ||
                          tx.transactionType === 'refund'
                            ? '+'
                            : '-'}
                          {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0,
                          }).format(tx.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            fontSize: { xs: '0.8rem', sm: '0.875rem' },
                          }}
                        >
                          {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0,
                          }).format(tx.balanceAfter)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {transactions.length > rowsPerPage && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={transactions.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                borderTop: '1px solid var(--color-border)',
                '& .MuiTablePagination-toolbar': {
                  flexWrap: 'wrap',
                  gap: 1,
                  px: { xs: 1, sm: 2 },
                },
                '& .MuiTablePagination-root': {
                  color: 'var(--color-text)',
                },
              }}
            />
          )}
        </>
      )}
    </Card>
  );
};

export default TransactionsList;
