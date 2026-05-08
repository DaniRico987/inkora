import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({
    example: 2,
    description: 'Nueva cantidad (1 a 3; para quitar usa DELETE)',
    minimum: 1,
    maximum: 3,
  })
  @IsInt({ message: 'quantity debe ser un entero' })
  @Min(1, {
    message:
      'quantity debe ser al menos 1; para eliminar el item usa DELETE /cart/items/:id',
  })
  @Max(3, {
    message:
      'No puedes tener mas de 3 ejemplares del mismo libro en el carrito',
  })
  quantity: number;
}
