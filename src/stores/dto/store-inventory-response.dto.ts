import { ApiProperty } from '@nestjs/swagger';
import { StoreResponseDto } from './store-response.dto';
import { StoreInventoryItemDto } from './store-inventory-item.dto';

export class StoreInventoryResponseDto {
  @ApiProperty({ type: () => StoreResponseDto })
  store: StoreResponseDto;

  @ApiProperty({ type: [StoreInventoryItemDto] })
  items: StoreInventoryItemDto[];

  @ApiProperty({ example: 24, description: 'Total disponible en la tienda' })
  totalAvailableQuantity: number;

  @ApiProperty({ example: 8, description: 'Total reservado en la tienda' })
  totalReservedQuantity: number;
}
