import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
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
  @ApiForbiddenResponse({ description: 'Solo los clientes pueden reservar libros' })
  async createReservation(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException('Solo los clientes pueden reservar libros');
    }

    return this.reservationsService.createReservation(req.user.clientId, dto);
  }
}
