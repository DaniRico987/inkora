import { ApiProperty } from '@nestjs/swagger';

export class CategoryListItemDto {
  @ApiProperty({
    description: 'ID único de la categoría',
    example: 5,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Realismo mágico',
  })
  name: string;
}