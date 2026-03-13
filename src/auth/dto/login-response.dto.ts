import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de acceso JWT',
  })
  accessToken: string;

  @ApiProperty({
    example: 'Bearer',
    description: 'Tipo de token',
  })
  tokenType: string;

  @ApiProperty({
    example: '1h',
    description: 'Tiempo de expiracion configurado para el token',
  })
  expiresIn: string;
}
