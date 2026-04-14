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
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseResponseDto } from './dto/purchase-response.dto';
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
      'Crea una compra con los items del carrito activo, persiste ETA y envia factura HTML al cliente.',
  })
  @ApiBody({ type: CreatePurchaseDto })
  @ApiResponse({
    status: 201,
    description: 'Compra creada exitosamente',
    type: PurchaseResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({ description: 'Solo clientes pueden confirmar compras' })
  async createPurchase(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: CreatePurchaseDto,
  ): Promise<PurchaseResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException('Solo los clientes pueden confirmar compras');
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
  @ApiForbiddenResponse({ description: 'No tienes permiso para ver esta compra' })
  async getPurchaseById(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) purchaseId: number,
  ): Promise<PurchaseResponseDto> {
    return this.purchasesService.getPurchaseById(purchaseId, req.user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Actualizar estado de compra',
    description: 'Solo administradores pueden actualizar el estado de una compra.',
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
  @ApiForbiddenResponse({ description: 'Solo administradores pueden actualizar estados' })
  async updatePurchaseStatus(
    @Param('id', ParseIntPipe) purchaseId: number,
    @Body() dto: UpdatePurchaseStatusDto,
  ): Promise<PurchaseResponseDto> {
    return this.purchasesService.updatePurchaseStatus(purchaseId, dto.status);
  }
}
