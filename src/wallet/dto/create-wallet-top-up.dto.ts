import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, IsOptional, IsString, IsIn } from 'class-validator';

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

  @ApiProperty({ example: 'COP', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['COP'])
  currency?: string;
}