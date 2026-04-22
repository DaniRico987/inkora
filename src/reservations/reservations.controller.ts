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
  ApiBadRequestResponse,
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
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('Reservations')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar reservas del cliente autenticado',
    description:
      'Retorna el historial de reservas del cliente autenticado, incluyendo reservas activas, vencidas, canceladas y convertidas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservas obtenidas exitosamente',
    type: ReservationResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo los clientes pueden listar sus reservas',
  })
  async listClientReservations(
    @Req() req: { user: AuthenticatedUser },
  ): Promise<ReservationResponseDto[]> {
    if (!req.user.clientId) {
      throw new ForbiddenException(
        'Solo los clientes pueden listar sus reservas',
      );
    }

    return this.reservationsService.listClientReservations(req.user.clientId);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear reserva de libros',
    description:
      'Crea una reserva con vigencia maxima de 24 horas, aplicando limites por cliente y disponibilidad en inventario.',
  })
  @ApiBody({ type: CreateReservationDto })
  @ApiResponse({
    status: 201,
    description: 'Reserva creada exitosamente',
    type: ReservationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Limites excedidos, datos invalidos o stock insuficiente',
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo los clientes pueden reservar libros',
  })
  async createReservation(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException('Solo los clientes pueden reservar libros');
    }

    return this.reservationsService.createReservation(req.user.clientId, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar una reserva activa',
    description:
      'Cancela una reserva activa del cliente autenticado, valida que no tenga pago asociado y libera el inventario reservado.',
  })
  @ApiParam({ name: 'id', type: 'integer', example: 23 })
  @ApiResponse({
    status: 200,
    description: 'Reserva cancelada exitosamente',
    type: ReservationResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'La reserva no esta activa, ya expiro, ya fue convertida o tiene un pago asociado',
  })
  @ApiNotFoundResponse({ description: 'Reserva no encontrada' })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'No tienes permiso para cancelar esta reserva',
  })
  async cancelReservation(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) reservationId: number,
  ): Promise<ReservationResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException(
        'Solo los clientes pueden cancelar reservas',
      );
    }

    return this.reservationsService.cancelReservation(
      req.user.clientId,
      reservationId,
    );
  }
}
