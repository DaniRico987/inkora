import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionDto {
  @ApiProperty({
    description: 'ID único de la suscripción',
    example: 10,
  })
  id: number;

  @ApiProperty({
    description: 'ID de la categoría suscrita',
    example: 5,
  })
  categoryId: number;

  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Realismo mágico',
  })
  categoryName: string;

  @ApiProperty({
    description: 'Fecha de suscripción',
    example: '2024-04-16T10:00:00.000Z',
  })
  subscribedAt: Date;
}