import { ApiProperty } from '@nestjs/swagger';
import { RecommendationItemDto } from './recommendation-item.dto';

export class RecommendationsResponseDto {
  @ApiProperty({
    enum: ['history', 'popular', 'bot'],
    example: 'history',
  })
  strategy: 'history' | 'popular' | 'bot';

  @ApiProperty({
    description: 'Momento de generación de las recomendaciones',
    example: '2026-06-08T12:00:00.000Z',
  })
  generatedAt: Date;

  @ApiProperty({ type: [RecommendationItemDto] })
  items: RecommendationItemDto[];
}