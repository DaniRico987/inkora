import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseStatus, ReservationStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const CLIENT_HISTORY_TYPES = ['purchases', 'reservations'] as const;
export type ClientHistoryTypeFilter = (typeof CLIENT_HISTORY_TYPES)[number];

export class GetClientHistoryQueryDto {
  @ApiPropertyOptional({
    enum: CLIENT_HISTORY_TYPES,
    description: 'Filtra por tipo de transacción',
    example: 'purchases',
  })
  @IsOptional()
  @IsIn(CLIENT_HISTORY_TYPES)
  type?: ClientHistoryTypeFilter;

  @ApiPropertyOptional({
    description:
      'Filtra por estado. Valores válidos de compras: inPreparation, shipped, delivered, cancelled. Valores válidos de reservas: active, cancelled, expired, converted.',
    example: 'active',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class ClientHistoryItemDto {
  @ApiProperty({ example: 12 })
  bookId: number;

  @ApiProperty({ example: 'Cien años de soledad' })
  title: string;

  @ApiProperty({ example: 'Gabriel Garcia Marquez' })
  author: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 24990 })
  unitPrice: number;

  @ApiProperty({ example: 49980 })
  subtotal: number;
}

export class ClientHistoryEntryDto {
  @ApiProperty({ enum: ['purchase', 'reservation'], example: 'purchase' })
  type: 'purchase' | 'reservation';

  @ApiProperty({ example: 154 })
  transactionId: number;

  @ApiProperty({ example: '2026-04-20T11:34:00.000Z' })
  transactionDate: Date;

  @ApiProperty({
    enum: [
      ...Object.values(PurchaseStatus),
      ...Object.values(ReservationStatus),
    ],
    example: PurchaseStatus.inPreparation,
  })
  status: PurchaseStatus | ReservationStatus;

  @ApiProperty({ example: 68990, description: 'Valor total de la transacción' })
  totalAmount: number;

  @ApiProperty({ type: [ClientHistoryItemDto] })
  items: ClientHistoryItemDto[];

  @ApiPropertyOptional({
    example: '2026-04-23T11:34:00.000Z',
    description: 'Solo aplica para reservas',
  })
  expirationDate?: Date;

  @ApiPropertyOptional({
    example: 86399,
    description:
      'Solo aplica para reservas activas. Tiempo restante en segundos para expirar',
  })
  remainingTimeSeconds?: number;
}
