import { ApiProperty } from '@nestjs/swagger';

export class StorePublicDto {
  @ApiProperty({ description: 'ID único de la tienda', example: 1 })
  storeId: number;

  @ApiProperty({
    description: 'Nombre de la tienda',
    example: 'Inkora Centro Pereira',
  })
  name: string;

  @ApiProperty({
    description: 'Dirección de la tienda',
    example: 'Carrera 7 #15-23, Centro',
  })
  address: string;

  @ApiProperty({ description: 'Ciudad de la tienda', example: 'Pereira' })
  city: string;

  @ApiProperty({
    description: 'Latitud de la tienda',
    example: 4.8133,
    nullable: true,
  })
  latitude: number | null;

  @ApiProperty({
    description: 'Longitud de la tienda',
    example: -75.6961,
    nullable: true,
  })
  longitude: number | null;
}
