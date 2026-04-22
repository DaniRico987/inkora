import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryMode } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePurchaseDto {
  @ApiProperty({ enum: DeliveryMode, example: DeliveryMode.homeDelivery })
  @IsEnum(DeliveryMode, { message: 'deliveryMode invalido' })
  deliveryMode: DeliveryMode;

  @ApiPropertyOptional({
    example: 2,
    description: 'Requerido para storePickup',
  })
  @IsOptional()
  @IsInt({ message: 'pickupStoreId debe ser un entero' })
  @IsPositive({ message: 'pickupStoreId debe ser mayor a 0' })
  pickupStoreId?: number;

  @ApiPropertyOptional({ example: 'Tarjeta de credito' })
  @IsOptional()
  @IsString({ message: 'paymentMethod debe ser texto' })
  @MaxLength(50, { message: 'paymentMethod no puede superar 50 caracteres' })
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'Av. Siempre Viva 742, Springfield' })
  @IsOptional()
  @IsString({ message: 'shippingAddress debe ser texto' })
  @MaxLength(255, {
    message: 'shippingAddress no puede superar 255 caracteres',
  })
  shippingAddress?: string;
}
