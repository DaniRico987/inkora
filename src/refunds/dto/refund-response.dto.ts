import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundStatus } from '@prisma/client';

export class RefundResponseDto {
  @ApiProperty({ example: 12 })
  refundId: number;

  @ApiProperty({ example: 9 })
  returnId: number;

  @ApiProperty({ example: 15 })
  purchaseId: number;

  @ApiProperty({ example: 54990 })
  amount: number;

  @ApiPropertyOptional({ example: 'Tarjeta de credito' })
  refundMethod: string | null;

  @ApiProperty({ example: '2026-05-20T12:00:00.000Z' })
  requestDate: Date;

  @ApiProperty({ enum: RefundStatus, example: RefundStatus.pending })
  status: RefundStatus;
}