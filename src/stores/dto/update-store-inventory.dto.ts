import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';

export class UpdateStoreInventoryItemDto {
    @ApiProperty({ example: 120, description: 'ID del libro' })
    @IsInt()
    bookId: number;

    @ApiProperty({ example: 18, description: 'Cantidad disponible (>= 0)' })
    @IsInt()
    @Min(0)
    availableQuantity: number;
}

export class UpdateStoreInventoryDto {
    @ApiProperty({ type: [UpdateStoreInventoryItemDto], description: 'Inventario editable de la tienda' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateStoreInventoryItemDto)
    items: UpdateStoreInventoryItemDto[];
}