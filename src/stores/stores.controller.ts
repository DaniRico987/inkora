import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StorePublicDto } from './dto/store-public.dto';
import { StoresService } from './stores.service';

@ApiTags('Stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

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
  @ApiResponse({ status: 200, description: 'Listado de tiendas' })
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
  @ApiResponse({ status: 201, description: 'Tienda creada' })
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
  @ApiResponse({ status: 200, description: 'Tienda actualizada' })
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
}
