import { ApiProperty } from '@nestjs/swagger';

export class PurchaseItemResponseDto {
  @ApiProperty({ example: 1 })
  purchaseItemId: number;

  @ApiProperty({ example: 42 })
  bookId: number;

  @ApiProperty({ example: 'Clean Code' })
  title: string;

  @ApiProperty({ example: 'Robert C. Martin' })
  author: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 14990, description: 'Precio unitario' })
  unitPrice: number;

  @ApiProperty({ example: 29980, description: 'Subtotal por item' })
  subtotal: number;
}
