import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookListItemDto {
  @ApiProperty({
    description: 'ID único del libro',
    example: 12,
  })
  id: number;

  @ApiPropertyOptional({
    description: 'URL de la portada del libro',
    example: 'https://cdn.inkora.com/books/12-cover.webp',
    nullable: true,
  })
  coverUrl?: string | null;

  @ApiProperty({
    description: 'Título del libro',
    example: 'Cien años de soledad',
  })
  title: string;

  @ApiProperty({
    description: 'Autor del libro',
    example: 'Gabriel García Márquez',
  })
  author: string;

  @ApiProperty({
    description: 'Precio del libro',
    example: 49900,
  })
  price: number;

  @ApiPropertyOptional({
    description: 'Cantidad disponible total en inventario',
    example: 8,
  })
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Estado o condición del libro',
    example: 'used',
    enum: ['new', 'used'],
    nullable: true,
  })
  status?: string | null;

  @ApiProperty({
    description: 'Indica si el libro está disponible para el catálogo general',
    example: true,
  })
  isAvailable: boolean;
}
