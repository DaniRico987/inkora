import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class CreateRefundRequestDto {
  @ApiProperty({ example: 9, description: 'ID de la devolucion aprobada' })
  @IsInt({ message: 'returnBookId debe ser un entero' })
  @IsPositive({ message: 'returnBookId debe ser mayor a 0' })
  returnBookId: number;
}