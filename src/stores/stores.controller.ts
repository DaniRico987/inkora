import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
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
import { StoresService } from './stores.service';

@ApiTags('Stores')
@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('JWT')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tiendas (admin)' })
  @ApiResponse({ status: 200, description: 'Listado de tiendas' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  @ApiForbiddenResponse({ description: 'No tienes permisos para listar tiendas' })
  async findAll() {
    return this.storesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Registrar nueva tienda (admin)' })
  @ApiBody({ type: CreateStoreDto })
  @ApiResponse({ status: 201, description: 'Tienda creada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  @ApiForbiddenResponse({ description: 'No tienes permisos para crear tiendas' })
  async create(@Body() dto: CreateStoreDto) {
    return this.storesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Editar tienda (admin)' })
  @ApiBody({ type: UpdateStoreDto })
  @ApiResponse({ status: 200, description: 'Tienda actualizada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Tienda no encontrada' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o ausente' })
  @ApiForbiddenResponse({ description: 'No tienes permisos para editar tiendas' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.update(id, dto);
  }
}

