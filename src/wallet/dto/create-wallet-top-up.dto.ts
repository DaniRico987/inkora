import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateWalletTopUpDto {
  @ApiProperty({ example: 15000, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 3, description: 'ID de la tarjeta registrada a usar' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cardId: number;
}