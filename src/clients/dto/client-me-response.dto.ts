import { CardType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClientMeSubscriptionDto {
  @ApiProperty({ example: 1 })
  subscriptionId: number;

  @ApiProperty({ example: 5 })
  categoryId: number;

  @ApiProperty({ example: 'Realismo mágico' })
  categoryName: string;

  @ApiProperty({ example: '2025-01-15T16:10:00.000Z' })
  subscribedAt: Date;
}

export class ClientMeCardDto {
  @ApiProperty({ example: 2 })
  cardId: number;

  @ApiProperty({ example: '**** **** **** 1234' })
  maskedNumber: string;

  @ApiProperty({ enum: CardType, example: CardType.debit })
  cardType: CardType;

  @ApiProperty({ example: '2030-12-31T00:00:00.000Z' })
  expirationDate: Date;

  @ApiProperty({ example: 'ANA PEREZ' })
  cardHolder: string;
}

export class ClientMeBirthdayVoucherDto {
  @ApiProperty({ example: 'BIRTH-42-may18' })
  code: string;

  @ApiProperty({ example: 10 })
  discountPercentage: number;

  @ApiProperty({ example: '2026-05-19T01:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ example: '2026-05-18T01:00:00.000Z' })
  generatedAt: Date;
}

export class ClientMeResponseDto {
  @ApiProperty({ example: 4 })
  clientId: number;

  @ApiProperty({ example: 10 })
  userId: number;

  @ApiProperty({ example: '123456789' })
  dni: string;

  @ApiProperty({ example: 'Ana' })
  firstName: string;

  @ApiProperty({ example: 'Pérez' })
  lastName: string;

  @ApiProperty({ example: 'ana@email.com' })
  email: string;

  @ApiProperty({ example: 'ana.perez' })
  username: string;

  @ApiProperty({ example: '1990-05-12T00:00:00.000Z' })
  birthDate: Date;

  @ApiProperty({ example: 'Pereira', nullable: true })
  birthPlace: string | null;

  @ApiProperty({ example: 'Calle 1 #2-3', nullable: true })
  address: string | null;

  @ApiProperty({ example: 'Femenino', nullable: true })
  gender: string | null;

  @ApiProperty({ type: ClientMeSubscriptionDto, isArray: true })
  subscriptions: ClientMeSubscriptionDto[];

  @ApiProperty({ type: ClientMeCardDto, isArray: true })
  cards: ClientMeCardDto[];

  @ApiPropertyOptional({ type: ClientMeBirthdayVoucherDto, nullable: true })
  activeBirthdayVoucher: ClientMeBirthdayVoucherDto | null;
}
