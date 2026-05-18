import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReturnReason, ReturnStatus } from '@prisma/client';

export class AdminReturnRequestItemDto {
  @ApiProperty({ example: 1 })
  purchaseItemId: number;

  @ApiProperty({ example: 22 })
  bookId: number;

  @ApiProperty({ example: 'Cien anos de soledad' })
  title: string;

  @ApiProperty({ example: 'Gabriel Garcia Marquez' })
  author: string;

  @ApiProperty({ example: 1 })
  quantity: number;

  @ApiPropertyOptional({ example: 'data:image/png;base64,iVBORw0...' })
  coverUrl: string | null;

  @ApiPropertyOptional({ example: 'data:image/png;base64,iVBORw0...' })
  previewUrl: string | null;
}

export class AdminReturnRequestDto {
  @ApiProperty({ example: 9 })
  returnBookId: number;

  @ApiProperty({ example: 15 })
  purchaseId: number;

  @ApiProperty({ example: 10 })
  clientId: number;

  @ApiProperty({ example: 'Ana Perez' })
  clientName: string;

  @ApiProperty({ example: 'ana@example.com' })
  clientEmail: string;

  @ApiProperty({ enum: ReturnReason, example: ReturnReason.badCondition })
  reason: ReturnReason | null;

  @ApiProperty({ example: 'Producto en mal estado' })
  reasonLabel: string;

  @ApiPropertyOptional({ example: 'El libro llego con la portada rota.' })
  additionalDescription: string | null;

  @ApiProperty({ enum: ReturnStatus, example: ReturnStatus.pending })
  status: ReturnStatus;

  @ApiProperty({ example: '2026-05-16T18:30:00.000Z' })
  requestDate: Date;

  @ApiPropertyOptional({ example: '2026-05-18T10:00:00.000Z' })
  approvalDate: Date | null;

  @ApiPropertyOptional({ example: 'data:image/png;base64,iVBORw0...' })
  qrCodeUrl: string | null;

  @ApiProperty({ example: '2026-05-10T14:00:00.000Z' })
  purchaseDate: Date;

  @ApiProperty({ example: 54990 })
  totalAmount: number;

  @ApiProperty({ type: [AdminReturnRequestItemDto] })
  items: AdminReturnRequestItemDto[];
}
