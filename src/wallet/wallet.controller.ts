import { Body, Controller, ForbiddenException, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateWalletTopUpDto } from './dto/create-wallet-top-up.dto';
import CreateWalletTopUpWithCardDto from './dto/create-wallet-top-up-with-card.dto';
import { GetWalletTransactionsQueryDto } from './dto/get-wallet-transactions-query.dto';
import { WalletSummaryDto } from './dto/wallet-summary.dto';
import { WalletTransactionsResponseDto } from './dto/wallet-transactions-response.dto';
import { WalletService } from './wallet.service';

@ApiTags('Wallet')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({
    summary: 'Consultar resumen del monedero',
    description:
      'Devuelve el saldo actual, totales de movimientos y la ultima transaccion del monedero del cliente autenticado. Requiere HTTPS en entornos productivos.',
  })
  @ApiOkResponse({ description: 'Resumen del monedero obtenido', type: WalletSummaryDto })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({ description: 'Solo los clientes pueden consultar su monedero' })
  async getWallet(@Req() req: { user: AuthenticatedUser }): Promise<WalletSummaryDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException('Solo los clientes pueden consultar su monedero');
    }

    return this.walletService.getWallet(req.user.clientId);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Consultar historial del monedero',
    description:
      'Retorna el historial paginado de movimientos financieros del cliente autenticado, ordenado de mas reciente a mas antiguo. Requiere HTTPS en entornos productivos.',
  })
  @ApiQuery({ name: 'type', required: false, enum: ['payment', 'refund'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'from', required: false, example: '2026-01-01T00:00:00.000Z' })
  @ApiQuery({ name: 'to', required: false, example: '2026-12-31T23:59:59.999Z' })
  @ApiOkResponse({
    description: 'Historial del monedero obtenido',
    type: WalletTransactionsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Filtros de consulta invalidos' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({ description: 'Solo los clientes pueden consultar su monedero' })
  async getWalletTransactions(
    @Req() req: { user: AuthenticatedUser },
    @Query() query: GetWalletTransactionsQueryDto,
  ): Promise<WalletTransactionsResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException('Solo los clientes pueden consultar su monedero');
    }

    return this.walletService.getWalletTransactions(req.user.clientId, query);
  }

  @Post('top-up')
  @ApiOperation({
    summary: 'Recargar saldo del monedero usando una tarjeta registrada',
  })
  @ApiCreatedResponse({
    description: 'Saldo recargado exitosamente',
    type: WalletSummaryDto,
  })
  @ApiBadRequestResponse({ description: 'Monto o tarjeta inválidos' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({ description: 'Solo los clientes pueden recargar su monedero' })
  async topUpWallet(
    @Req() req: { user: AuthenticatedUser },
    @Body() payload: CreateWalletTopUpDto,
  ): Promise<WalletSummaryDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException('Solo los clientes pueden recargar su monedero');
    }

    return this.walletService.topUpWallet(req.user.clientId, payload);
  }

  @Post('top-up-with-card')
  @ApiOperation({ summary: 'Recargar saldo del monedero usando datos de tarjeta (sin registrar)' })
  @ApiCreatedResponse({ description: 'Saldo recargado exitosamente', type: WalletSummaryDto })
  async topUpWalletWithCard(
    @Req() req: { user: AuthenticatedUser },
    @Body() payload: CreateWalletTopUpWithCardDto,
  ): Promise<WalletSummaryDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException('Solo los clientes pueden recargar su monedero');
    }

    // Delegate to service which validates currency and records movement
    return this.walletService.topUpWalletWithCard(req.user.clientId, payload as any);
  }
}