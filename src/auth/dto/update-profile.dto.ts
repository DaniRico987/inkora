import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsEmail,
  IsDateString,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    example: '1990-05-12',
    description: 'Formato YYYY-MM-DD',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'Pereira' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  birthPlace?: string;

  @ApiPropertyOptional({ example: 'Calle 1 #2-3' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: '170001' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Apto 201' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressComplement?: string;

  @ApiPropertyOptional({ example: 'Cali, Valle del Cauca, Colombia' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLocation?: string;

  @ApiPropertyOptional({ example: 'Femenino' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({ example: 'admin@inkora.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'admin.ana' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;
}
