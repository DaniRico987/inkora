import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ClientsService } from './clients.service';
import {
  CLIENT_HISTORY_TYPES,
  ClientHistoryEntryDto,
  GetClientHistoryQueryDto,
} from './dto/client-history.dto';
import { ClientMeResponseDto } from './dto/client-me-response.dto';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { CreateClientCardDto } from './dto/create-client-card.dto';

@ApiTags('Clients')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Consultar perfil del cliente autenticado',
    description:
      'Retorna perfil personal, suscripciones literarias, tarjetas activas registradas y el bono de cumpleaños activo del cliente autenticado.',
  })
  @ApiOkResponse({
    description: 'Perfil del cliente obtenido exitosamente',
    type: ClientMeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo los clientes pueden consultar este recurso',
  })
  async getMyProfile(
    @Req() req: { user: AuthenticatedUser },
  ): Promise<ClientMeResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException(
        'Solo los clientes pueden consultar este recurso',
      );
    }

    return this.clientsService.getMyProfile(req.user.userId);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Actualizar perfil del cliente autenticado',
    description:
      'Actualiza datos personales del cliente autenticado. El DNI no es editable y no se admite en el payload.',
  })
  @ApiOkResponse({
    description: 'Perfil actualizado exitosamente',
    type: ClientMeResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos inválidos o email/username duplicado',
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo los clientes pueden actualizar su perfil',
  })
  async updateMyProfile(
    @Req() req: { user: AuthenticatedUser },
    @Body() payload: UpdateClientProfileDto,
  ): Promise<ClientMeResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException(
        'Solo los clientes pueden actualizar su perfil',
      );
    }

    return this.clientsService.updateMyProfile(req.user.userId, payload);
  }

  @Post('me/cards')
  @ApiOperation({
    summary: 'Registrar tarjeta enmascarada del cliente autenticado',
  })
  @ApiCreatedResponse({
    description: 'Tarjeta registrada exitosamente',
    type: ClientMeResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Payload de tarjeta inválido' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo los clientes pueden registrar tarjetas',
  })
  async createMyCard(
    @Req() req: { user: AuthenticatedUser },
    @Body() payload: CreateClientCardDto,
  ): Promise<ClientMeResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException(
        'Solo los clientes pueden registrar tarjetas',
      );
    }

    return this.clientsService.createMyCard(req.user.userId, payload);
  }

  @Delete('me/cards/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar tarjeta registrada del cliente autenticado',
  })
  @ApiNoContentResponse({ description: 'Tarjeta eliminada exitosamente' })
  @ApiNotFoundResponse({ description: 'Tarjeta no encontrada' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo los clientes pueden eliminar tarjetas',
  })
  async deleteMyCard(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) cardId: number,
  ): Promise<void> {
    if (!req.user.clientId) {
      throw new ForbiddenException(
        'Solo los clientes pueden eliminar tarjetas',
      );
    }

    await this.clientsService.deleteMyCard(req.user.userId, cardId);
  }

  @Get('me/history')
  @ApiOperation({
    summary: 'Consultar historial completo del cliente autenticado',
    description:
      'Retorna compras y reservas del cliente autenticado, incluyendo fecha, productos, estado, valor total y tiempo restante en reservas activas.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: CLIENT_HISTORY_TYPES,
    description: 'Filtrar por tipo de transacción',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Filtrar por estado. Compras: inPreparation, shipped, delivered, cancelled. Reservas: active, cancelled, expired, converted.',
  })
  @ApiOkResponse({
    description: 'Historial del cliente obtenido exitosamente',
    type: ClientHistoryEntryDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Filtros inválidos para los estados solicitados',
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo los clientes pueden consultar su historial',
  })
  @ApiNotFoundResponse({
    description: 'Cliente no encontrado',
  })
  async getMyHistory(
    @Req() req: { user: AuthenticatedUser },
    @Query() query: GetClientHistoryQueryDto,
  ): Promise<ClientHistoryEntryDto[]> {
    if (!req.user.clientId) {
      throw new ForbiddenException(
        'Solo los clientes pueden consultar su historial',
      );
    }

    return this.clientsService.getClientHistory(req.user.clientId, query);
  }
}
