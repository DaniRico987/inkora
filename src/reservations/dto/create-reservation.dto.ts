import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateReservationItemDto } from './create-reservation-item.dto';

export class CreateReservationDto {
  @ApiProperty({
    type: [CreateReservationItemDto],
    description: 'Listado de libros a reservar',
  })
  @ArrayMinSize(1, { message: 'Debes incluir al menos un libro' })
  @ArrayMaxSize(5, { message: 'No puedes reservar mas de 5 libros diferentes' })
  @ValidateNested({ each: true })
  @Type(() => CreateReservationItemDto)
  items: CreateReservationItemDto[];
}
