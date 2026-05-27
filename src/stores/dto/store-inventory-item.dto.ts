import { ApiProperty } from '@nestjs/swagger';

export class StoreInventoryItemDto {
  @ApiProperty({ example: 42 })
  bookId: number;

  @ApiProperty({ example: 'Clean Code' })
  title: string;

  @ApiProperty({ example: 'Robert C. Martin' })
  author: string;

  @ApiProperty({ example: 12 })
  availableQuantity: number;

  @ApiProperty({ example: 4 })
  reservedQuantity: number;

  @ApiProperty({ example: 16, description: 'Suma de disponible y reservado' })
  totalQuantity: number;
}
