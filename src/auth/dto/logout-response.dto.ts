import { ApiProperty } from '@nestjs/swagger';

export class LogoutResponseDto {
  @ApiProperty({
    example: 'Sesión cerrada exitosamente. Por favor, inicia sesión nuevamente.',
    description: 'Mensaje de confirmación de logout',
  })
  message: string;
}

export class LogoutAllResponseDto {
  @ApiProperty({
    example: 'Todas las sesiones han sido cerradas exitosamente.',
    description: 'Mensaje de confirmación de logout de todas las sesiones',
  })
  message: string;

  @ApiProperty({
    example: 1,
    description: 'Número de sesiones revocadas (actualmente solo la actual)',
  })
  revokedSessions: number;
}
