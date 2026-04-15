import { ApiProperty } from '@nestjs/swagger';
import { PurchaseStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdatePurchaseStatusDto {
  @ApiProperty({ enum: PurchaseStatus, example: PurchaseStatus.shipped })
  @IsEnum(PurchaseStatus, { message: 'status invalido' })
  status: PurchaseStatus;
}
