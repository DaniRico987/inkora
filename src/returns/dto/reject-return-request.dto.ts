import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectReturnRequestDto {
  @ApiPropertyOptional({ example: 'Articulo no cumple politicas de devolucion' })
  adminNote?: string;
}
