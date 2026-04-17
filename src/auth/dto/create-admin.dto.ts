import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({ example: 'Ana' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Perez', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'admin@inkora.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin.ana', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ example: '1098765432', required: false })
  @IsOptional()
  @IsString()
  dni?: string;

  @ApiProperty({ example: '1990-05-12', description: 'Formato YYYY-MM-DD', required: false })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ example: 'Pereira', required: false })
  @IsOptional()
  @IsString()
  birthPlace?: string;

  @ApiProperty({ example: 'Calle 1 #2-3', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'Femenino', required: false })
  @IsOptional()
  @IsString()
  gender?: string;
}
