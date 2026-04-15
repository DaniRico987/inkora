import { ApiProperty } from '@nestjs/swagger';

export class ReservationItemResponseDto {
  @ApiProperty({ example: 10 })
  reservationItemId: number;

  @ApiProperty({ example: 12 })
  bookId: number;

  @ApiProperty({ example: 'El nombre del viento' })
  title: string;

  @ApiProperty({ example: 2 })
  quantity: number;
}
