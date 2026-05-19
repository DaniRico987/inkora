import { ApiProperty } from '@nestjs/swagger';
import { StoreStatus } from '@prisma/client';

export class StoreResponseDto {
  @ApiProperty({ example: 1 })
  storeId: number;

  @ApiProperty({ example: 'Inkora Centro' })
  name: string;

  @ApiProperty({ example: 'Av. Principal 1234' })
  address: string;

  @ApiProperty({ example: 'Pereira' })
  city: string;

  @ApiProperty({ example: 4.8133, nullable: true })
  latitude: number | null;

  @ApiProperty({ example: -75.6961, nullable: true })
  longitude: number | null;

  @ApiProperty({ example: 100, nullable: true })
  capacity: number | null;

  @ApiProperty({ enum: StoreStatus, example: StoreStatus.active })
  status: StoreStatus;
}
