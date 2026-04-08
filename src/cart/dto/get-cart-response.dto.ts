import { ApiProperty } from '@nestjs/swagger';
import { CartItemResponseDto } from './cart-item-response.dto';

export class GetCartResponseDto {
  @ApiProperty({ example: 1, description: 'ID del carrito' })
  cartId: number;

  @ApiProperty({
    type: [CartItemResponseDto],
    description: 'Items en el carrito',
  })
  items: CartItemResponseDto[];

  @ApiProperty({
    example: '99.95',
    description: 'Subtotal de todos los items',
    type: 'string',
  })
  subtotal: string | number;

  @ApiProperty({
    example: '20.99',
    description: 'Impuestos (21%)',
    type: 'string',
  })
  tax: string | number;

  @ApiProperty({
    example: '120.94',
    description: 'Total = subtotal + impuestos',
    type: 'string',
  })
  total: string | number;

  @ApiProperty({
    example: 2,
    description: 'Cantidad total de items en el carrito',
  })
  itemCount: number;

  @ApiProperty({
    example: '2026-04-08T10:30:00Z',
    description: 'Fecha de creación del carrito',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-04-08T10:35:00Z',
    description: 'Fecha de última actualización',
  })
  updatedAt: Date;
}
