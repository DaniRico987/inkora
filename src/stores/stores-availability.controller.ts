import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StoresService, type StoreAvailabilityDto } from './stores.service';

@ApiTags('Stores')
@Controller('stores')
export class StoresAvailabilityController {
  constructor(private readonly storesService: StoresService) { }

  @Get('available')
  @ApiOperation({
    summary: 'Listar disponibilidad por tienda para un libro',
    description:
      'Retorna todas las tiendas activas con su cantidad disponible del libro solicitado (incluye 0), ordenadas por disponibilidad.',
  })
  @ApiQuery({ name: 'bookId', type: Number, example: 42 })
  @ApiResponse({
    status: 200,
    description: 'Tiendas activas con disponibilidad del libro',
    type: [Object],
  })
  async findAvailableByBook(
    @Query('bookId', ParseIntPipe) bookId: number,
  ): Promise<StoreAvailabilityDto[]> {
    return this.storesService.findAvailableByBook(bookId);
  }
}
