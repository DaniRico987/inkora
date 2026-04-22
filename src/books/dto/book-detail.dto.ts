import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookImageDto {
  @ApiProperty({
    description: 'ID único de la imagen',
    example: 3,
  })
  id: number;

  @ApiProperty({
    description: 'URL de la imagen del libro',
    example: 'https://cdn.inkora.com/books/12-gallery-1.webp',
  })
  url: string;

  @ApiProperty({
    description: 'Orden de visualización de la imagen',
    example: 1,
  })
  displayOrder: number;
}

export class BookCategoryDto {
  @ApiProperty({
    description: 'ID único de la categoría',
    example: 5,
  })
  id: number;

  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Realismo mágico',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la categoría',
    example: 'Narrativas con elementos fantásticos integrados a la realidad.',
    nullable: true,
  })
  description?: string | null;
}

export class BookStoreAvailabilityDto {
  @ApiProperty({
    description: 'ID de la tienda',
    example: 2,
  })
  storeId: number;

  @ApiProperty({
    description: 'Nombre de la tienda',
    example: 'INKORA Pereira Centro',
  })
  storeName: string;

  @ApiProperty({
    description: 'Ciudad de la tienda',
    example: 'Pereira',
  })
  city: string;

  @ApiProperty({
    description: 'Cantidad disponible actualmente en la tienda',
    example: 4,
  })
  availableQuantity: number;
}

export class BookDetailDto {
  @ApiProperty({
    description: 'ID único del libro',
    example: 12,
  })
  id: number;

  @ApiProperty({
    description: 'Título del libro',
    example: 'Cien años de soledad',
  })
  title: string;

  @ApiProperty({
    description: 'Autor del libro',
    example: 'Gabriel García Márquez',
  })
  author: string;

  @ApiPropertyOptional({
    description: 'Año de publicación',
    example: 1967,
    nullable: true,
  })
  publicationYear?: number | null;

  @ApiPropertyOptional({
    description: 'Editorial',
    example: 'Editorial Sudamericana',
    nullable: true,
  })
  publisher?: string | null;

  @ApiPropertyOptional({
    description: 'ISBN del libro',
    example: '9780307474728',
    nullable: true,
  })
  isbn?: string | null;

  @ApiPropertyOptional({
    description: 'Idioma del libro',
    example: 'Español',
    nullable: true,
  })
  language?: string | null;

  @ApiPropertyOptional({
    description: 'Número de páginas',
    example: 432,
    nullable: true,
  })
  pageCount?: number | null;

  @ApiProperty({
    description: 'Precio del libro',
    example: 49900,
  })
  price: number;

  @ApiProperty({
    description: 'Cantidad disponible total en inventario',
    example: 8,
  })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Estado o condición del libro',
    example: 'used',
    enum: ['new', 'used'],
    nullable: true,
  })
  status?: string | null;

  @ApiProperty({
    description: 'Indica si el libro está disponible',
    example: true,
  })
  isAvailable: boolean;

  @ApiPropertyOptional({
    description: 'Descripción del libro',
    example:
      'La historia de la familia Buendía a lo largo de varias generaciones.',
    nullable: true,
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'URL de la portada del libro',
    example: 'https://cdn.inkora.com/books/12-cover.webp',
    nullable: true,
  })
  coverUrl?: string | null;

  @ApiPropertyOptional({
    description: 'URL del preview del libro',
    example: 'https://cdn.inkora.com/books/12-preview.pdf',
    nullable: true,
  })
  preview?: string | null;

  @ApiProperty({
    description: 'Imágenes adicionales del libro',
    type: [BookImageDto],
  })
  images: BookImageDto[];

  @ApiProperty({
    description: 'Categorías asociadas al libro',
    type: [BookCategoryDto],
  })
  categories: BookCategoryDto[];

  @ApiProperty({
    description: 'Disponibilidad actual por tienda',
    type: [BookStoreAvailabilityDto],
  })
  inventoriesByStore: BookStoreAvailabilityDto[];
}
