import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { GetCartResponseDto } from './dto/get-cart-response.dto';
import { CartItemResponseDto } from './dto/cart-item-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ForbiddenException } from '@nestjs/common';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * GET /cart
   * Obtiene el carrito activo del cliente autenticado
   */
  @Get()
  @ApiOperation({
    summary: 'Obtener carrito activo',
    description:
      'Retorna el carrito con todos los items, cantidades, precios unitarios y totales calculados',
  })
  @ApiResponse({
    status: 200,
    description: 'Carrito obtenido exitosamente',
    type: GetCartResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT inválido o expirado' })
  async getCart(@Request() req): Promise<GetCartResponseDto> {
    const clientId = req.user.clientId;
    if (!clientId) {
      throw new ForbiddenException('Solo los clientes pueden acceder al carrito');
    }
    return this.cartService.getActiveCart(clientId);
  }

  /**
   * POST /cart/items
   * Agrega un libro al carrito (o suma cantidad si ya existe)
   */
  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Agregar libro al carrito',
    description: 'Agrega un libro al carrito o suma cantidad si ya existe',
  })
  @ApiBody({ type: CreateCartItemDto })
  @ApiResponse({
    status: 201,
    description: 'Item agregado al carrito exitosamente',
    type: CartItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o libro no disponible' })
  @ApiResponse({ status: 404, description: 'Libro no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Token JWT inválido o expirado' })
  async addItem(
    @Request() req,
    @Body() dto: CreateCartItemDto,
  ): Promise<CartItemResponseDto> {
    const clientId = req.user.clientId;
    if (!clientId) {
      throw new ForbiddenException('Solo los clientes pueden acceder al carrito');
    }
    return this.cartService.addItem(clientId, dto);
  }

  /**
   * PATCH /cart/items/:id
   * Actualiza la cantidad de un item en el carrito
   */
  @Patch('items/:id')
  @ApiOperation({
    summary: 'Actualizar cantidad de ítem',
    description: 'Modifica la cantidad de un item específico en el carrito',
  })
  @ApiParam({
    name: 'id',
    type: 'integer',
    description: 'ID del item a actualizar',
    example: 1,
  })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiResponse({
    status: 200,
    description: 'Cantidad actualizada exitosamente',
    type: CartItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Cantidad inválida' })
  @ApiResponse({ status: 404, description: 'Item no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Token JWT inválido o expirado' })
  @ApiForbiddenResponse({ description: 'No tienes permiso para actualizar este item' })
  async updateItem(
    @Request() req,
    @Param('id', ParseIntPipe) cartItemId: number,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartItemResponseDto> {
    const clientId = req.user.clientId;
    if (!clientId) {
      throw new ForbiddenException('Solo los clientes pueden acceder al carrito');
    }
    return this.cartService.updateItem(clientId, cartItemId, dto);
  }

  /**
   * DELETE /cart/items/:id
   * Elimina un item del carrito
   */
  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar ítem del carrito',
    description: 'Remueve un item específico del carrito del cliente',
  })
  @ApiParam({
    name: 'id',
    type: 'integer',
    description: 'ID del item a eliminar',
    example: 1,
  })
  @ApiResponse({ status: 204, description: 'Item eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Item no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Token JWT inválido o expirado' })
  @ApiForbiddenResponse({ description: 'No tienes permiso para eliminar este item' })
  async removeItem(
    @Request() req,
    @Param('id', ParseIntPipe) cartItemId: number,
  ): Promise<void> {
    const clientId = req.user.clientId;
    if (!clientId) {
      throw new ForbiddenException('Solo los clientes pueden acceder al carrito');
    }
    await this.cartService.removeItem(clientId, cartItemId);
  }
}
