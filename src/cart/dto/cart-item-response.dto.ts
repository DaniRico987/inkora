import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({ example: 1, description: 'ID del item en el carrito' })
  cartItemId: number;

  @ApiProperty({ example: 5, description: 'ID del libro' })
  bookId: number;

  @ApiProperty({ example: 'El Quijote', description: 'Título del libro' })
  title: string;

  @ApiProperty({
    example: 'Miguel de Cervantes',
    description: 'Autor del libro',
  })
  author: string;

  @ApiProperty({ example: 2, description: 'Cantidad en el carrito' })
  quantity: number;

  @ApiProperty({
    example: '19.99',
    description: 'Precio unitario del libro',
    type: 'string',
  })
  unitPrice: string | number;

  @ApiProperty({
    example: '39.98',
    description: 'Subtotal = cantidad * precioUnitario',
    type: 'string',
  })
  subtotal: string | number;

  @ApiProperty({
    example: '2026-04-08T10:30:00Z',
    description: 'Fecha de creación',
  })
  createdAt?: Date;

  @ApiProperty({
    example: '2026-04-08T10:35:00Z',
    description: 'Fecha de última actualización',
  })
  updatedAt?: Date;
}
