import { ApiProperty } from '@nestjs/swagger';
import { ReservationStatus } from '@prisma/client';
import { ReservationItemResponseDto } from './reservation-item-response.dto';

export class ReservationResponseDto {
  @ApiProperty({ example: 34 })
  reservationId: number;

  @ApiProperty({ example: 10 })
  clientId: number;

  @ApiProperty({ enum: ReservationStatus, example: ReservationStatus.active })
  status: ReservationStatus;

  @ApiProperty({ example: '2026-04-15T14:00:00.000Z' })
  reservationDate: Date;

  @ApiProperty({
    example: '2026-04-16T14:00:00.000Z',
    description: 'Fecha de expiracion automatica de la reserva (24 horas)',
  })
  expirationDate: Date;

  @ApiProperty({ type: [ReservationItemResponseDto] })
  items: ReservationItemResponseDto[];
}
