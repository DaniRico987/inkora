import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'usuario@correo.com',
    description: 'Correo o nombre de usuario',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({
    example: 'S3gura123!',
    description: 'Contrasena de la cuenta',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: '03AFcWeA...',
    description: 'Token de verificacion reCAPTCHA',
  })
  @IsString()
  @IsNotEmpty()
  recaptchaToken: string;
}
