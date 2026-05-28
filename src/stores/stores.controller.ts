import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateStoreDto } from './dto/create-store.dto';
import { StoreInventoryResponseDto } from './dto/store-inventory-response.dto';
import { UpdateStoreInventoryDto } from './dto/update-store-inventory.dto';
import { StoreOrdersResponseDto } from './dto/store-orders-response.dto';
import { StoreResponseDto } from './dto/store-response.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StorePublicDto } from './dto/store-public.dto';
import { StoresService } from './stores.service';

@ApiTags('Stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) { }

  @Get('public')
  @ApiOperation({ summary: 'Listar tiendas públicas con coordenadas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de tiendas activas con coordenadas',
    type: [StorePublicDto],
    example: [
      {
        storeId: 1,
        name: 'Inkora Centro Pereira',
        address: 'Carrera 7 #15-23, Centro',
        city: 'Pereira',
        latitude: 4.8133,
        longitude: -75.6961,
      },
      {
        storeId: 2,
        name: 'Inkora Mall del Café',
        address: 'Av. Circunvalar #1-23, Mall del Café',
        city: 'Pereira',
        latitude: 4.8047,
        longitude: -75.6885,
      },
      {
        storeId: 3,
        name: 'Inkora Villa Country',
        address: 'Calle 23 #5-45, Villa Country',
        city: 'Pereira',
        latitude: 4.7956,
        longitude: -75.6812,
      },
    ],
  })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async findPublicStores(): Promise<StorePublicDto[]> {
    return this.storesService.findPublicStores();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Listar tiendas (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Listado de tiendas',
    type: [StoreResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para listar tiendas',
  })
  async findAll() {
    return this.storesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Registrar nueva tienda (admin)' })
  @ApiBody({ type: CreateStoreDto })
  @ApiResponse({
    status: 201,
    description: 'Tienda creada',
    type: StoreResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para crear tiendas',
  })
  async create(@Body() dto: CreateStoreDto) {
    return this.storesService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Editar tienda (admin)' })
  @ApiBody({ type: UpdateStoreDto })
  @ApiResponse({
    status: 200,
    description: 'Tienda actualizada',
    type: StoreResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para editar tiendas',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.update(id, dto);
  }

  @Get(':id/inventory')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Obtener inventario de una tienda (admin)' })
  @ApiParam({ name: 'id', type: 'integer', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Inventario de la tienda',
    type: StoreInventoryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para consultar inventario',
  })
  @ApiNotFoundResponse({ description: 'Tienda no encontrada' })
  async getInventory(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StoreInventoryResponseDto> {
    return this.storesService.findInventoryByStoreId(id);
  }

  @Patch(':id/inventory')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Actualizar inventario de una tienda (admin)' })
  @ApiBody({ type: UpdateStoreInventoryDto })
  @ApiResponse({
    status: 200,
    description: 'Inventario de la tienda actualizado',
    type: StoreInventoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para editar inventario',
  })
  async updateInventory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStoreInventoryDto,
  ): Promise<StoreInventoryResponseDto> {
    return this.storesService.updateInventoryByStoreId(id, dto);
  }

  @Get(':id/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Obtener pedidos asociados a una tienda (admin)' })
  @ApiParam({ name: 'id', type: 'integer', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Pedidos asociados a la tienda',
    type: StoreOrdersResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para consultar pedidos',
  })
  @ApiNotFoundResponse({ description: 'Tienda no encontrada' })
  async getOrders(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StoreOrdersResponseDto> {
    return this.storesService.findOrdersByStoreId(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Eliminar tienda (admin)' })
  @ApiParam({ name: 'id', type: 'integer', example: 1 })
  @ApiResponse({ status: 200, description: 'Tienda eliminada' })
  @ApiBadRequestResponse({
    description: 'La tienda tiene pedidos pendientes y no puede ser eliminada',
  })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para eliminar tiendas',
  })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.storesService.delete(id);
  }
}
