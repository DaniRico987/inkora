import { CardType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsString, Matches, MaxLength } from 'class-validator';

export class CreateClientCardDto {
  @ApiProperty({
    example: '**** **** **** 1234',
    description: 'Número de tarjeta enmascarado',
  })
  @IsString()
  @Matches(/^[*\d\s-]{8,25}$/, {
    message: 'maskedNumber debe contener solo asteriscos, dígitos, espacios o guiones',
  })
  maskedNumber: string;

  @ApiProperty({ enum: CardType, example: CardType.credit })
  @IsEnum(CardType)
  cardType: CardType;

  @ApiProperty({
    example: '2030-12-31',
    description: 'Fecha de expiración en formato YYYY-MM-DD',
  })
  @IsDateString()
  expirationDate: string;

  @ApiProperty({ example: 'ANA PEREZ' })
  @IsString()
  @MaxLength(150)
  cardHolder: string;
}
