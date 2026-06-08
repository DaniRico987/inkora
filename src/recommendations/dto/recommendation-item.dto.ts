import { ApiProperty } from '@nestjs/swagger';
import { BookListItemDto } from '../../books/dto/book-list-item.dto';

export class RecommendationItemDto {
  @ApiProperty({ type: BookListItemDto })
  book: BookListItemDto;

  @ApiProperty({ example: 12.5 })
  score: number;

  @ApiProperty({
    type: [String],
    example: ['Coincide con tu interés en realismo mágico'],
  })
  reasons: string[];
}