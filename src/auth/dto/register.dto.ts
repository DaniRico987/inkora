import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  Length,
  MaxLength,
  IsDateString,
  IsOptional,
  IsIn,
  IsEmail,
  Matches,
  MinLength,
  IsArray,
  IsInt,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Documento Nacional de Identidad o identificación equivalente',
    minLength: 6,
    maxLength: 20,
    example: '12345678A',
  })
  @IsString()
  @Length(6, 20)
  dni: string;

  @ApiProperty({
    description: 'Nombres del usuario',
    maxLength: 100,
    example: 'Juan',
  })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    description: 'Apellidos del usuario',
    maxLength: 100,
    example: 'Pérez',
  })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    description: 'Fecha de nacimiento en formato ISO (YYYY-MM-DD)',
    example: '1990-01-01',
  })
  @IsDateString()
  birthDate: string;

  @ApiProperty({
    description: 'Lugar de nacimiento (opcional)',
    maxLength: 100,
    example: 'Madrid, España',
    required: false,
  })
  @IsOptional()
  @MaxLength(100)
  birthPlace?: string;

  @ApiProperty({
    description: 'Dirección de residencia (opcional)',
    maxLength: 255,
    example: 'Calle Mayor 123, 1A',
    required: false,
  })
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @ApiProperty({
    description: 'Género del usuario',
    enum: ['male', 'female', 'other', 'prefer_not_say'],
    example: 'male',
    required: false,
  })
  @IsOptional()
  @IsIn(['male', 'female', 'other', 'prefer_not_say'])
  gender?: string;

  @ApiProperty({
    description: 'Correo electrónico único para registro',
    example: 'juan.perez@ejemplo.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Nombre de usuario único para la plataforma',
    minLength: 3,
    maxLength: 50,
    example: 'juanperez90',
  })
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username: string;

  @ApiProperty({
    description: 'Contraseña (mínimo 8 caracteres, debe incluir mayúsculas, minúsculas y números)',
    minLength: 8,
    example: 'Password123!',
  })
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;

  @ApiProperty({
    description: 'IDs de las categorías literarias favoritas del usuario (opcional)',
    type: [Number],
    example: [1, 2, 5],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  categoryIds?: number[];
}
