import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class SubscribeDto {
  @ApiProperty({
    description: 'ID de la categoría a la que suscribirse',
    example: 5,
  })
  @IsInt()
  @IsPositive()
  categoryId: number;
}