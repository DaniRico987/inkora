import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsInt, Min, IsPositive } from 'class-validator';

class InventoryUpdateItem {
  @ApiProperty({ example: 1, description: 'ID de la tienda' })
  @IsInt()
  @IsPositive()
  storeId: number;

  @ApiProperty({ example: 10, description: 'Cantidad disponible (>= 0)' })
  @IsInt()
  @Min(0)
  availableQuantity: number;
}

export class UpdateBookInventoryDto {
  @ApiProperty({ type: [InventoryUpdateItem], description: 'Lista de actualizaciones por tienda' })
  @IsArray()
  @ArrayNotEmpty()
  items: InventoryUpdateItem[];
}
