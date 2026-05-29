import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  Min,
  IsString,
  MaxLength,
  IsNotEmpty,
  IsOptional,
  IsIn,
  ValidateNested,
  IsDefined,
} from 'class-validator';

export class NewCardDto {
  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  cardholder: string;

  @ApiProperty({ example: '4111111111111111' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  cardNumber: string;

  @ApiProperty({ example: '12/26' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  expiry: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4)
  cvv: string;
}

export class CreateWalletTopUpWithCardDto {
  @ApiProperty({ example: 15000, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ type: NewCardDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => NewCardDto)
  newCard: NewCardDto;

  @ApiProperty({ example: 'COP', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['COP'])
  currency?: string;
}

export default CreateWalletTopUpWithCardDto;
