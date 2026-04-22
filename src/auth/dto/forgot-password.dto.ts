import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    description:
      'Correo electrónico del usuario para enviar el enlace de recuperación',
    example: 'usuario@ejemplo.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Token de reCAPTCHA validado en el frontend',
    example: 'v3_token_from_frontend',
  })
  @IsString()
  recaptchaToken: string;
}
