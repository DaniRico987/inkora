import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookModelDto {
  @ApiProperty({
    description: 'ID único del modelo 3D',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'ID del libro asociado',
    example: 12,
  })
  bookId: number;

  @ApiProperty({
    description: 'Contenido del modelo glTF/GLB en Base64',
    example: 'data:model/gltf-binary;base64,AAA...',
  })
  modelGlb: string;

  @ApiPropertyOptional({
    description: 'Nombre del archivo original',
    example: 'quijote.glb',
  })
  fileName?: string | null;
}
