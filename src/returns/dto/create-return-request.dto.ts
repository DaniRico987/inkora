import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnReason } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateReturnRequestDto {
  @ApiProperty({ example: 15, description: 'ID de la compra entregada a devolver' })
  @IsInt({ message: 'purchaseId debe ser un entero' })
  @IsPositive({ message: 'purchaseId debe ser mayor a 0' })
  purchaseId: number;

  @ApiProperty({
    enum: ReturnReason,
    example: ReturnReason.badCondition,
    description:
      'Motivo de devolucion: badCondition (mal estado), didNotMeetExpectations (no lleno expectativas), lateDelivery (fuera de tiempo)',
  })
  @IsEnum(ReturnReason, { message: 'reason invalido' })
  reason: ReturnReason;

  @ApiPropertyOptional({
    example: 'La portada llego doblada y con manchas de humedad.',
    description: 'Descripcion adicional opcional para contextualizar la solicitud',
  })
  @IsOptional()
  @IsString({ message: 'additionalDescription debe ser texto' })
  @MaxLength(1000, {
    message: 'additionalDescription no puede superar 1000 caracteres',
  })
  additionalDescription?: string;
}
