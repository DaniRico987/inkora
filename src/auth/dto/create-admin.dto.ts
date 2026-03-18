import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAdminDto {
  @ApiProperty({ example: '1098765432' })
  @IsString()
  @IsNotEmpty()
  dni: string;

  @ApiProperty({ example: 'Ana' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Perez' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '1990-05-12', description: 'Formato YYYY-MM-DD' })
  @IsDateString()
  birthDate: string;

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

  @ApiProperty({ example: 'admin@inkora.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'admin.ana' })
  @IsString()
  @IsNotEmpty()
  username: string;
}
