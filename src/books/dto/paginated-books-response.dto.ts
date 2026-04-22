import { ApiProperty } from '@nestjs/swagger';
import { BookListItemDto } from './book-list-item.dto';

export class PaginatedBooksResponseDto {
  @ApiProperty({
    description: 'Listado paginado de libros',
    type: [BookListItemDto],
  })
  items: BookListItemDto[];

  @ApiProperty({
    description: 'Página actual',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Cantidad de elementos por página',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Cantidad total de libros disponibles',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Cantidad total de páginas',
    example: 5,
  })
  totalPages: number;
}
