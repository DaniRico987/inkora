import { ApiProperty } from '@nestjs/swagger';
import { DeliveryMode, PurchaseStatus } from '@prisma/client';
import { StoreOrderItemDto } from './store-order-item.dto';

export class StoreOrderClientDto {
  @ApiProperty({ example: 7 })
  clientId: number;

  @ApiProperty({ example: 'Ana' })
  firstName: string;

  @ApiProperty({ example: 'Gomez' })
  lastName: string;

  @ApiProperty({ example: 'ana@example.com' })
  email: string;
}

export class StoreOrderResponseDto {
  @ApiProperty({ example: 15 })
  purchaseId: number;

  @ApiProperty({ example: '2026-05-18T12:10:00.000Z' })
  purchaseDate: Date;

  @ApiProperty({ enum: PurchaseStatus, example: PurchaseStatus.inPreparation })
  status: PurchaseStatus;

  @ApiProperty({ example: 42980 })
  totalAmount: number;

  @ApiProperty({
    enum: DeliveryMode,
    nullable: true,
    example: DeliveryMode.storePickup,
  })
  deliveryMode: DeliveryMode | null;

  @ApiProperty({ example: 2, nullable: true })
  pickupStoreId: number | null;

  @ApiProperty({ example: '2026-05-20T09:00:00.000Z', nullable: true })
  dispatchDate: Date | null;

  @ApiProperty({ type: () => StoreOrderClientDto })
  client: StoreOrderClientDto;

  @ApiProperty({ type: [StoreOrderItemDto] })
  items: StoreOrderItemDto[];
}
