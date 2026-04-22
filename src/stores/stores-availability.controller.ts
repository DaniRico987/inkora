import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import {
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { StoresService, type StoreAvailabilityDto } from './stores.service';

@ApiTags('Stores')
@Controller('stores')
export class StoresAvailabilityController {
    constructor(private readonly storesService: StoresService) { }

    @Get('available')
    @ApiOperation({
        summary: 'Listar tiendas con stock de un libro',
        description:
            'Retorna las tiendas activas que tienen stock disponible del libro solicitado, ordenadas por disponibilidad.',
    })
    @ApiQuery({ name: 'bookId', type: Number, example: 42 })
    @ApiResponse({
        status: 200,
        description: 'Tiendas con stock disponible',
        type: [Object],
    })
    async findAvailableByBook(
        @Query('bookId', ParseIntPipe) bookId: number,
    ): Promise<StoreAvailabilityDto[]> {
        return this.storesService.findAvailableByBook(bookId);
    }
}