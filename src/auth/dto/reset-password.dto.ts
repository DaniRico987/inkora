import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de recuperación recibido por correo',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Nueva contraseña del usuario',
    minLength: 8,
    example: 'P@ssw0rd123!',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({
    description: 'Token de reCAPTCHA generado por el cliente',
  })
  @IsString()
  recaptchaToken: string;
}
