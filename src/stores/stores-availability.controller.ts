import { Controller, Get, ParseFloatPipe, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StoreNearestDto } from './dto/store-nearest-response.dto';
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

  @Get('nearest')
  @ApiOperation({
    summary: 'Listar las tiendas más cercanas a una ubicación',
    description:
      'Calcula la distancia en línea recta desde unas coordenadas dadas y ordena las tiendas activas con ubicación válida de menor a mayor distancia.',
  })
  @ApiQuery({ name: 'lat', type: Number, example: 4.8133 })
  @ApiQuery({ name: 'lng', type: Number, example: -75.6961 })
  @ApiResponse({
    status: 200,
    description: 'Tiendas activas ordenadas por distancia',
    type: [StoreNearestDto],
  })
  async findNearestStores(
    @Query('lat', ParseFloatPipe) latitude: number,
    @Query('lng', ParseFloatPipe) longitude: number,
  ): Promise<StoreNearestDto[]> {
    return this.storesService.findNearestStores(latitude, longitude);
  }
}
