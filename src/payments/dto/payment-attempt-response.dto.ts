import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentAttemptStatus } from '@prisma/client';

export class PaymentAttemptResponseDto {
  @ApiProperty({ example: 1 })
  paymentAttemptId: number;

  @ApiProperty({ enum: PaymentAttemptStatus, example: PaymentAttemptStatus.pending })
  status: PaymentAttemptStatus;

  @ApiProperty({ example: 42980 })
  amount: number;

  @ApiProperty({ example: 'COP' })
  currency: string;

  @ApiPropertyOptional({ example: 'pay-1-inkora' })
  gatewayReference?: string | null;

  @ApiPropertyOptional({ example: 'https://checkout.example.com/pay-1-inkora' })
  checkoutUrl?: string | null;

  @ApiPropertyOptional({ example: 15, nullable: true })
  purchaseId?: number | null;

  @ApiPropertyOptional({ example: '2026-06-08T12:00:00.000Z', nullable: true })
  expiresAt?: Date | null;

  @ApiProperty({ example: '2026-06-08T11:30:00.000Z' })
  createdAt: Date;
}