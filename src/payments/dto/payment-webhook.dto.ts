import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentAttemptStatus } from '@prisma/client';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class PaymentWebhookDto {
  @ApiPropertyOptional({ example: 'pay-1-inkora' })
  @IsString({ message: 'gatewayReference debe ser texto' })
  @MaxLength(255, { message: 'gatewayReference no puede superar 255 caracteres' })
  gatewayReference: string;

  @ApiPropertyOptional({ enum: PaymentAttemptStatus, example: PaymentAttemptStatus.approved })
  @IsString({ message: 'status debe ser texto' })
  @IsIn([
    PaymentAttemptStatus.pending,
    PaymentAttemptStatus.processing,
    PaymentAttemptStatus.approved,
    PaymentAttemptStatus.failed,
    PaymentAttemptStatus.cancelled,
    PaymentAttemptStatus.expired,
  ])
  status: PaymentAttemptStatus;

  @ApiPropertyOptional({ example: 42980 })
  @IsOptional()
  @IsNumber({}, { message: 'amount debe ser numerico' })
  amount?: number;

  @ApiPropertyOptional({ example: 'COP' })
  @IsOptional()
  @IsString({ message: 'currency debe ser texto' })
  currency?: string;

  @ApiPropertyOptional({ example: 'trx_123456' })
  @IsOptional()
  @IsString({ message: 'transactionId debe ser texto' })
  transactionId?: string;

  @ApiPropertyOptional({ example: 'payment.approved' })
  @IsOptional()
  @IsString({ message: 'event debe ser texto' })
  event?: string;

  @ApiPropertyOptional({ example: '2026-06-08T11:30:00.000Z' })
  @IsOptional()
  @IsString({ message: 'timestamp debe ser texto' })
  timestamp?: string;
}