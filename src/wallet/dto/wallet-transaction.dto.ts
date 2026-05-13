import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class WalletTransactionDto {
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

  @ApiPropertyOptional({ example: 15, nullable: true })
  purchaseId?: number | null;

  @ApiPropertyOptional({ example: 7, nullable: true })
  refundId?: number | null;

  @ApiPropertyOptional({ example: 'pagado con tarjeta terminada en 1234', nullable: true })
  gatewayReference?: string | null;
}