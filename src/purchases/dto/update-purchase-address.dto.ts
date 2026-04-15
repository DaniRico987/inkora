import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdatePurchaseAddressDto {
  @ApiProperty({
    example: 'Av. Corrientes 1234, Buenos Aires, Argentina',
    description: 'Nueva direccion de entrega del pedido',
  })
  @IsString({ message: 'shippingAddress debe ser texto' })
  @IsNotEmpty({ message: 'shippingAddress no puede estar vacia' })
  @MaxLength(255, {
    message: 'shippingAddress no puede superar 255 caracteres',
  })
  shippingAddress: string;
}
