import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, Max } from 'class-validator';

export class CreateReservationItemDto {
  @ApiProperty({ example: 12, description: 'ID del libro a reservar' })
  @IsInt({ message: 'bookId debe ser un entero' })
  @IsPositive({ message: 'bookId debe ser mayor a 0' })
  bookId: number;

  @ApiProperty({
    example: 2,
    minimum: 1,
    maximum: 3,
    description: 'Cantidad de ejemplares del libro (maximo 3 por libro)',
  })
  @IsInt({ message: 'quantity debe ser un entero' })
  @IsPositive({ message: 'quantity debe ser mayor a 0' })
  @Max(3, { message: 'No puedes reservar mas de 3 ejemplares del mismo libro' })
  quantity: number;
}
