import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class WalletLastTransactionDto {
  @ApiProperty({ example: 91 })
  transactionId: number;

  @ApiProperty({ enum: TransactionType, example: TransactionType.payment })
  transactionType: TransactionType;

  @ApiProperty({ example: 42980 })
  amount: number;

  @ApiProperty({ example: -42980 })
  balanceAfter: number;

  @ApiProperty({ example: '2026-05-13T12:00:00.000Z' })
  transactionDate: Date;
}

export class WalletSummaryDto {
  @ApiProperty({ example: 4 })
  clientId: number;

  @ApiProperty({ example: 125000, description: 'Saldo actual del monedero' })
  availableBalance: number;

  @ApiProperty({ example: 214900, description: 'Total de pagos registrados' })
  totalPayments: number;

  @ApiProperty({ example: 35000, description: 'Total reembolsado al monedero' })
  totalRefunds: number;

  @ApiProperty({ example: 12 })
  transactionCount: number;

  @ApiProperty({ example: 2, description: 'Tarjetas activas registradas' })
  activeCardsCount: number;

  @ApiProperty({ type: WalletLastTransactionDto, nullable: true })
  lastTransaction: WalletLastTransactionDto | null;
}