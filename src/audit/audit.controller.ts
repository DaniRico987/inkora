import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';
import { AuditService } from './audit.service';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('root')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar logs de auditoria',
    description:
      'Solo root puede consultar operaciones criticas registradas. Permite filtrar por usuario, accion, entidad y rango de fechas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logs de auditoria obtenidos correctamente',
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT invalido o expirado' })
  @ApiForbiddenResponse({ description: 'Solo root puede acceder a este recurso' })
  async findAll(@Query() query: AuditLogFilterDto) {
    return this.auditService.listLogs(query);
  }
}
