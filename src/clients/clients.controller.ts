import {
    Controller,
    ForbiddenException,
    Get,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiForbiddenResponse,
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

@ApiTags('Clients')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

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
    async getMyHistory(
        @Req() req: { user: AuthenticatedUser },
        @Query() query: GetClientHistoryQueryDto,
    ): Promise<ClientHistoryEntryDto[]> {
        if (!req.user.clientId) {
            throw new ForbiddenException('Solo los clientes pueden consultar su historial');
        }

        return this.clientsService.getClientHistory(req.user.clientId, query);
    }
}
