import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryMode } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ enum: DeliveryMode, example: DeliveryMode.homeDelivery })
  @IsEnum(DeliveryMode, { message: 'deliveryMode invalido' })
  deliveryMode: DeliveryMode;

  @ApiPropertyOptional({ example: 2, description: 'Requerido para storePickup' })
  @IsOptional()
  pickupStoreId?: number;

  @ApiPropertyOptional({
    example: false,
    description:
      'Permite confirmar retiro en tienda con stock parcial cuando no existe ninguna sucursal con cobertura total.',
  })
  @IsOptional()
  @IsBoolean({ message: 'allowWaitlistPickup debe ser booleano' })
  allowWaitlistPickup?: boolean;

  @ApiPropertyOptional({ example: 'Tarjeta de credito' })
  @IsOptional()
  @IsString({ message: 'paymentMethod debe ser texto' })
  @MaxLength(50, { message: 'paymentMethod no puede superar 50 caracteres' })
  paymentMethod?: string;

  @ApiPropertyOptional({
    example: 'COP',
    description: 'Moneda de la transacción. Solo se acepta COP actualmente.',
  })
  @IsOptional()
  @IsString({ message: 'currency debe ser texto' })
  @IsIn(['COP'], { message: 'Solo se acepta la moneda COP' })
  currency?: string;

  @ApiPropertyOptional({ example: 'Av. Siempre Viva 742, Springfield' })
  @IsOptional()
  @IsString({ message: 'shippingAddress debe ser texto' })
  @MaxLength(255, {
    message: 'shippingAddress no puede superar 255 caracteres',
  })
  shippingAddress?: string;

  @ApiPropertyOptional({
    example: 'BIRTH-123-xyz',
    description: 'Codigo de voucher de cliente',
  })
  @IsOptional()
  @IsString({ message: 'voucherCode debe ser texto' })
  @MaxLength(100, { message: 'voucherCode no puede superar 100 caracteres' })
  voucherCode?: string;
}