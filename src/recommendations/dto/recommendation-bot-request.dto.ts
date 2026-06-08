import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class RecommendationBotRequestDto {
  @ApiPropertyOptional({
    description: 'IDs de categorías preferidas',
    example: [1, 3, 5],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  preferredCategoryIds?: number[];

  @ApiPropertyOptional({
    description: 'Autores preferidos',
    example: ['Gabriel Garcia Marquez', 'Isabel Allende'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  preferredAuthors?: string[];

  @ApiPropertyOptional({
    description: 'Términos libres o temática declarada',
    example: 'realismo mágico y novelas cortas',
  })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional({
    description: 'Idioma preferido',
    example: 'Español',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Precio mínimo sugerido',
    example: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Precio máximo sugerido',
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Cantidad máxima de recomendaciones',
    example: 10,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Excluir libros ya comprados por el cliente',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  excludeOwned?: boolean;
}