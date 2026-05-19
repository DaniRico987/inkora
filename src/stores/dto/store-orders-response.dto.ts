import { ApiProperty } from '@nestjs/swagger';
import { StoreResponseDto } from './store-response.dto';
import { StoreOrderResponseDto } from './store-order-response.dto';

export class StoreOrdersResponseDto {
  @ApiProperty({ type: () => StoreResponseDto })
  store: StoreResponseDto;

  @ApiProperty({ type: [StoreOrderResponseDto] })
  orders: StoreOrderResponseDto[];

  @ApiProperty({
    example: 12,
    description: 'Total de pedidos asociados a la tienda',
  })
  totalOrders: number;

  @ApiProperty({
    example: 3,
    description: 'Pedidos pendientes de preparación o envío',
  })
  pendingOrders: number;
}
