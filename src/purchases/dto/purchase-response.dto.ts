import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryMode, PurchaseStatus } from '@prisma/client';
import { PurchaseItemResponseDto } from './purchase-item-response.dto';

export class PurchaseResponseDto {
  @ApiProperty({ example: 15 })
  purchaseId: number;

  @ApiProperty({ example: 7 })
  clientId: number;

  @ApiProperty({ example: '2026-03-18T12:10:00.000Z' })
  purchaseDate: Date;

  @ApiProperty({ example: 42980, description: 'Total final de la compra' })
  totalAmount: number;

  @ApiPropertyOptional({ example: 'Tarjeta de credito' })
  paymentMethod?: string | null;

  @ApiPropertyOptional({ example: 'Av. Siempre Viva 742, Springfield' })
  shippingAddress?: string | null;

  @ApiPropertyOptional({
    enum: DeliveryMode,
    example: DeliveryMode.homeDelivery,
  })
  deliveryMode?: DeliveryMode | null;

  @ApiPropertyOptional({ example: 2 })
  pickupStoreId?: number | null;

  @ApiPropertyOptional({ example: 'Entrega estimada para 20/03/2026' })
  estimatedDeliveryTime?: string | null;

  @ApiPropertyOptional({ example: '2026-03-19T09:00:00.000Z' })
  dispatchDate?: Date | null;

  @ApiProperty({ enum: PurchaseStatus, example: PurchaseStatus.inPreparation })
  status: PurchaseStatus;

  @ApiProperty({ type: [PurchaseItemResponseDto] })
  items: PurchaseItemResponseDto[];
}
