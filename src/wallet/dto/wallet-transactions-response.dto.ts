import { ApiProperty } from '@nestjs/swagger';
import { WalletTransactionDto } from './wallet-transaction.dto';

export class WalletTransactionsResponseDto {
  @ApiProperty({ type: [WalletTransactionDto] })
  items: WalletTransactionDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 53 })
  total: number;
}