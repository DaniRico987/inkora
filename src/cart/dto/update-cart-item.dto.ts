import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, description: 'Nueva cantidad' })
  @IsInt({ message: 'quantity debe ser un entero' })
  @Min(0, { message: 'quantity no puede ser menor a 0' })
  quantity: number;
}
