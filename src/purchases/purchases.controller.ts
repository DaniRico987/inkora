import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { audit } from '../audit/audit.decorator';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseResponseDto } from './dto/purchase-response.dto';
import { UpdatePurchaseAddressDto } from './dto/update-purchase-address.dto';
import { UpdatePurchaseStatusDto } from './dto/update-purchase-status.dto';
import { PurchasesService } from './purchases.service';

@ApiTags('Purchases')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @ApiOperation({
    summary: 'Confirmar compra desde carrito',
    description:
      'Crea una compra con los items del carrito activo, valida stock, actualiza inventario, marca el carrito como procesado y envia factura HTML al cliente.',
  })
  @ApiBody({ type: CreatePurchaseDto })
  @ApiResponse({
    status: 201,
    description: 'Compra creada exitosamente',
    type: PurchaseResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'El carrito no tiene items, faltan datos obligatorios, no hay stock suficiente o la tienda de retiro es invalida',
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo clientes pueden confirmar compras',
  })
  @audit('compra_creada')
  async createPurchase(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: CreatePurchaseDto,
  ): Promise<PurchaseResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException(
        'Solo los clientes pueden confirmar compras',
      );
    }

    return this.purchasesService.createPurchase(req.user.clientId, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalle de compra',
    description:
      'Retorna una compra por ID. Los clientes solo pueden ver sus compras; los administradores pueden ver cualquiera.',
  })
  @ApiParam({ name: 'id', type: 'integer', example: 15 })
  @ApiResponse({
    status: 200,
    description: 'Detalle de compra obtenido exitosamente',
    type: PurchaseResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Compra no encontrada' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'No tienes permiso para ver esta compra',
  })
  async getPurchaseById(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) purchaseId: number,
  ): Promise<PurchaseResponseDto> {
    return this.purchasesService.getPurchaseById(purchaseId, req.user);
  }

  @Patch(':id/address')
  @ApiOperation({
    summary: 'Actualizar direccion de entrega',
    description:
      'Permite modificar la direccion de un pedido solo mientras permanece en preparacion.',
  })
  @ApiParam({ name: 'id', type: 'integer', example: 15 })
  @ApiBody({ type: UpdatePurchaseAddressDto })
  @ApiResponse({
    status: 200,
    description: 'Direccion de entrega actualizada exitosamente',
    type: PurchaseResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Compra no encontrada' })
  @ApiBadRequestResponse({
    description:
      'El pedido ya fue despachado o los datos de direccion son invalidos',
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'No tienes permiso para modificar esta compra',
  })
  @audit('compra_editada_direccion')
  async updatePurchaseAddress(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) purchaseId: number,
    @Body() dto: UpdatePurchaseAddressDto,
  ): Promise<PurchaseResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException(
        'Solo los clientes pueden modificar pedidos',
      );
    }

    return this.purchasesService.updatePurchaseAddress(
      purchaseId,
      req.user.clientId,
      dto.shippingAddress,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Actualizar estado de compra',
    description:
      'Solo administradores pueden actualizar el estado de una compra.',
  })
  @ApiParam({ name: 'id', type: 'integer', example: 15 })
  @ApiBody({ type: UpdatePurchaseStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Estado de compra actualizado exitosamente',
    type: PurchaseResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Compra no encontrada' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo administradores pueden actualizar estados',
  })
  @audit('compra_editada_estado')
  async updatePurchaseStatus(
    @Param('id', ParseIntPipe) purchaseId: number,
    @Body() dto: UpdatePurchaseStatusDto,
  ): Promise<PurchaseResponseDto> {
    return this.purchasesService.updatePurchaseStatus(purchaseId, dto.status);
  }
}
