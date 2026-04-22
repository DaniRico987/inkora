import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de recuperación recibido en el correo',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Nueva contraseña para la cuenta (mínimo 8 caracteres)',
    minLength: 8,
    example: 'NewSecurePass123',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({
    description: 'Token de reCAPTCHA validado en el frontend',
    example: 'v3_token_from_frontend',
  })
  @IsString()
  recaptchaToken: string;
}
