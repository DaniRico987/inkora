import { ApiProperty } from '@nestjs/swagger';

export class UploadBookGalleryResponseDto {
  @ApiProperty({ description: 'ID de la imagen creada', example: 123 })
  id: number;

  @ApiProperty({ description: 'URL de la imagen (data:image/...)', example: 'data:image/webp;base64,AAA' })
  url: string;

  @ApiProperty({ description: 'Orden de visualización', example: 1 })
  displayOrder: number;
}
