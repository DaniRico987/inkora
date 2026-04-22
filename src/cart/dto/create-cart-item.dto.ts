import { IsInt, Min, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCartItemDto {
  @ApiProperty({ example: 1, description: 'ID del libro a agregar' })
  @IsInt({ message: 'bookId debe ser un entero' })
  @IsPositive({ message: 'bookId debe ser mayor a 0' })
  bookId: number;

  @ApiProperty({
    example: 1,
    description: 'Cantidad a agregar',
    required: false,
  })
  @IsInt({ message: 'quantity debe ser un entero' })
  @Min(1, { message: 'quantity debe ser al menos 1' })
  quantity: number = 1;
}
