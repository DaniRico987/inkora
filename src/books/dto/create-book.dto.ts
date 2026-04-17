import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
  ArrayNotEmpty,
  IsArray,
} from 'class-validator';
import { BookCondition } from '@prisma/client';

export class CreateBookDto {
  @ApiProperty({
    description: 'Título del libro',
    example: 'Cien años de soledad',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  title: string;

  @ApiProperty({
    description: 'Autor del libro',
    example: 'Gabriel García Márquez',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  author: string;

  @ApiPropertyOptional({
    description: 'Año de publicación',
    example: 1967,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(2100)
  publicationYear?: number | null;

  @ApiPropertyOptional({
    description: 'Editorial',
    example: 'Editorial Sudamericana',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  publisher?: string | null;

  @ApiPropertyOptional({
    description: 'ISBN del libro',
    example: '9780307474728',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(10, 20)
  isbn?: string | null;

  @ApiPropertyOptional({
    description: 'Idioma del libro',
    example: 'Español',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  language?: string | null;

  @ApiPropertyOptional({
    description: 'Número de páginas',
    example: 432,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  pageCount?: number | null;

  @ApiProperty({
    description: 'Precio del libro en la moneda configurada',
    example: 49900,
  })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({
    description: 'Estado o condición del libro',
    example: 'new',
    enum: BookCondition,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(BookCondition)
  condition?: BookCondition | null;

  @ApiPropertyOptional({
    description: 'Indica si el libro está disponible en el catálogo',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Descripción del libro',
    example: 'La historia de la familia Buendía a lo largo de varias generaciones.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    description: 'URL de la portada del libro',
    example: 'https://cdn.inkora.com/books/12-cover.webp',
    nullable: true,
  })
  @IsOptional()
  @IsUrl()
  coverUrl?: string | null;

  @ApiPropertyOptional({
    description: 'URL de un preview del libro (PDF, etc.)',
    example: 'https://cdn.inkora.com/books/12-preview.pdf',
    nullable: true,
  })
  @IsOptional()
  @IsUrl()
  previewUrl?: string | null;

  @ApiProperty({
    description: 'IDs de las categorías a las que pertenece el libro',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  categoryIds: number[];

  @ApiProperty({
    description: 'Cantidad inicial de inventario',
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  initialInventoryQuantity: number;
}

