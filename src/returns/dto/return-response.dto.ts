import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnReason, ReturnStatus } from '@prisma/client';

export class ReturnResponseDto {
  @ApiProperty({ example: 9 })
  returnBookId: number;

  @ApiProperty({ example: 15 })
  purchaseId: number;

  @ApiProperty({ example: 10 })
  clientId: number;

  @ApiProperty({ enum: ReturnReason, example: ReturnReason.lateDelivery })
  reason: ReturnReason | null;

  @ApiPropertyOptional({
    example: 'Llego cinco dias despues de la fecha estimada.',
  })
  additionalDescription: string | null;

  @ApiProperty({ example: '2026-05-16T18:30:00.000Z' })
  requestDate: Date;

  @ApiProperty({ enum: ReturnStatus, example: ReturnStatus.pending })
  status: ReturnStatus;

  @ApiPropertyOptional({
    example: 'https://cdn.inkora.com/returns/qr/return-9.png',
  })
  qrCodeUrl: string | null;

  @ApiPropertyOptional({ example: '2026-05-18T11:00:00.000Z' })
  approvalDate: Date | null;
  @ApiPropertyOptional({ example: 'No cumple condiciones de devolucion' })
  adminNote?: string | null;

  @ApiPropertyOptional({ example: '2026-05-18T11:00:00.000Z' })
  decisionDate?: Date | null;
}
