import { ApiProperty } from '@nestjs/swagger';

export class UploadBookCoverResponseDto {
  @ApiProperty({
    description: 'ID del libro actualizado',
    example: 12,
  })
  id: number;

  @ApiProperty({
    description: 'URL pública de la portada almacenada en S3',
    example:
      'https://inkora-bucket.s3.us-east-1.amazonaws.com/books/12/covers/123-cover.webp',
  })
  coverUrl: string;
}
