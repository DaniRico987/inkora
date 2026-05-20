import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { RefundResponseDto } from './dto/refund-response.dto';
import { RefundsService } from './refunds.service';

@ApiTags('Refunds')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @ApiOperation({
    summary: 'Solicitar reembolso de una devolucion aprobada',
    description:
      'El cliente autenticado solicita un reembolso asociado a una devolucion aprobada dentro de los primeros 7 dias desde la compra.',
  })
  @ApiBody({ type: CreateRefundRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Reembolso solicitado exitosamente',
    type: RefundResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Devolucion aprobada no encontrada' })
  @ApiBadRequestResponse({
    description:
      'La devolucion no esta aprobada, ya tiene reembolso o vencio el plazo de 7 dias',
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo los clientes pueden solicitar reembolsos propios',
  })
  async createRefundRequest(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: CreateRefundRequestDto,
  ): Promise<RefundResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException(
        'Solo los clientes pueden solicitar reembolsos',
      );
    }

    return this.refundsService.createRefundRequest(req.user.clientId, dto);
  }

  @Patch(':id/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Procesar reembolso',
    description:
      'Procesa un reembolso pendiente y lo devuelve al mismo medio de pago original.',
  })
  @ApiParam({ name: 'id', type: 'integer', example: 12 })
  @ApiResponse({
    status: 200,
    description: 'Reembolso procesado exitosamente',
    type: RefundResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Reembolso no encontrado' })
  @ApiBadRequestResponse({
    description:
      'Solo se pueden procesar reembolsos en estado pending o sin devolucion aprobada',
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo administradores pueden procesar reembolsos',
  })
  async processRefund(
    @Param('id', ParseIntPipe) refundId: number,
  ): Promise<RefundResponseDto> {
    return this.refundsService.processRefund(refundId);
  }
}