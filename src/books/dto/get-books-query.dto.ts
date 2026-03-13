import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const BOOK_CONDITIONS = ['new', 'used'] as const;
export const BOOK_SORT_BY = ['price', 'publicationYear', 'relevance'] as const;
export const BOOK_SORT_ORDER = ['asc', 'desc'] as const;

export class GetBooksQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra por titulo (busqueda parcial, no sensible a mayusculas)',
    example: 'Cien anos',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Filtra por autor (busqueda parcial, no sensible a mayusculas)',
    example: 'Garcia Marquez',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  author?: string;

  @ApiPropertyOptional({
    description: 'Filtra por categoria',
    example: 3,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({
    description: 'Filtra por idioma exacto (no sensible a mayusculas)',
    example: 'Espanol',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @ApiPropertyOptional({
    description: 'Filtra por condicion del libro',
    enum: BOOK_CONDITIONS,
    example: 'used',
  })
  @IsOptional()
  @IsIn(BOOK_CONDITIONS)
  condition?: (typeof BOOK_CONDITIONS)[number];

  @ApiPropertyOptional({
    description: 'Precio minimo (inclusive)',
    example: 10000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false }, { message: 'minPrice must be a number' })
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Precio maximo (inclusive)',
    example: 50000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false }, { message: 'maxPrice must be a number' })
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Filtra por ano de publicacion exacto',
    example: 1967,
    minimum: 1000,
    maximum: 2100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({
    description: 'Número de página',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de libros por página',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Campo por el cual ordenar resultados',
    enum: BOOK_SORT_BY,
    default: 'relevance',
    example: 'relevance',
  })
  @IsOptional()
  @IsIn(BOOK_SORT_BY)
  sortBy?: (typeof BOOK_SORT_BY)[number] = 'relevance';

  @ApiPropertyOptional({
    description: 'Direccion del ordenamiento',
    enum: BOOK_SORT_ORDER,
    default: 'desc',
    example: 'desc',
  })
  @IsOptional()
  @IsIn(BOOK_SORT_ORDER)
  sortOrder?: (typeof BOOK_SORT_ORDER)[number] = 'desc';
}
