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
import { AdminReturnRequestDto } from './dto/admin-return-request.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { ReturnResponseDto } from './dto/return-response.dto';
import { ReturnsService } from './returns.service';

@ApiTags('Returns')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Listar solicitudes de devolucion pendientes',
    description:
      'Retorna solicitudes de devolucion pendientes para gestion administrativa.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitudes de devolucion pendientes',
    type: AdminReturnRequestDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo administradores pueden ver solicitudes pendientes',
  })
  async getPendingReturnRequests(): Promise<AdminReturnRequestDto[]> {
    return this.returnsService.getPendingReturnRequests();
  }

  @Post()
  @ApiOperation({
    summary: 'Solicitar devolucion de una compra',
    description:
      'El cliente autenticado solicita devolucion de una compra entregada indicando motivo y descripcion opcional.',
  })
  @ApiBody({ type: CreateReturnRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Solicitud de devolucion creada exitosamente',
    type: ReturnResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Compra no encontrada' })
  @ApiBadRequestResponse({
    description:
      'La compra no esta en estado delivered, ya tiene devolucion o vencio el plazo',
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo clientes pueden solicitar devoluciones propias',
  })
  async createReturnRequest(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: CreateReturnRequestDto,
  ): Promise<ReturnResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException(
        'Solo los clientes pueden solicitar devoluciones',
      );
    }

    return this.returnsService.createReturnRequest(req.user.clientId, dto);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Aprobar solicitud de devolucion',
    description:
      'Aprueba una solicitud pendiente, genera QR unico en base64 y envia correo al cliente.',
  })
  @ApiParam({ name: 'id', type: 'integer', example: 9 })
  @ApiResponse({
    status: 200,
    description: 'Solicitud de devolucion aprobada exitosamente',
    type: ReturnResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Solicitud de devolucion no encontrada' })
  @ApiBadRequestResponse({
    description: 'Solo se pueden aprobar solicitudes en estado pending',
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo administradores pueden aprobar devoluciones',
  })
  async approveReturnRequest(
    @Param('id', ParseIntPipe) returnBookId: number,
  ): Promise<ReturnResponseDto> {
    return this.returnsService.approveReturnRequest(returnBookId);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Rechazar solicitud de devolucion',
    description: 'Rechaza una solicitud pendiente y notifica al cliente por correo.',
  })
  @ApiParam({ name: 'id', type: 'integer', example: 9 })
  @ApiResponse({
    status: 200,
    description: 'Solicitud de devolucion rechazada exitosamente',
    type: ReturnResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Solicitud de devolucion no encontrada' })
  @ApiBadRequestResponse({
    description: 'Solo se pueden rechazar solicitudes en estado pending',
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({
    description: 'Solo administradores pueden rechazar devoluciones',
  })
  async rejectReturnRequest(
    @Param('id', ParseIntPipe) returnBookId: number,
    @Body() dto: import('./dto/reject-return-request.dto').RejectReturnRequestDto,
  ): Promise<ReturnResponseDto> {
    return this.returnsService.rejectReturnRequest(
      returnBookId,
      dto?.adminNote?.trim() || null,
    );
  }
}
