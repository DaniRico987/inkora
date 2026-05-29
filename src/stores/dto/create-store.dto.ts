import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  Matches,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { StoreStatus } from '@prisma/client';

export class CreateStoreDto {
  @ApiProperty({
    description: 'Nombre de la tienda',
    example: 'Inkora Centro',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  name: string;

  @ApiProperty({
    description: 'Dirección de la tienda',
    example: 'Av. Principal 1234',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  @Matches(/^(?=.*[\p{L}\p{N}])[\p{L}\p{N}\s#.,\-/]+$/u)
  address: string;

  @ApiProperty({
    description: 'Ciudad donde se ubica la tienda',
    example: 'Santiago',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  @Matches(/^(?=.*[\p{L}\p{N}])[\p{L}\p{N}\s#.,\-/]+$/u)
  city: string;

  @ApiPropertyOptional({
    description: 'Latitud de la tienda',
    example: -33.4489,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional({
    description: 'Longitud de la tienda',
    example: -70.6693,
    nullable: true,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @ApiPropertyOptional({
    description: 'Capacidad máxima estimada de la tienda',
    example: 100,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number | null;

  @ApiPropertyOptional({
    description: 'Estado de la tienda',
    example: 'active',
    enum: StoreStatus,
    default: StoreStatus.active,
  })
  @IsOptional()
  @IsEnum(StoreStatus)
  status?: StoreStatus;
}
