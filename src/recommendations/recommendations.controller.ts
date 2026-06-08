import { Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RecommendationBotRequestDto } from './dto/recommendation-bot-request.dto';
import { RecommendationsResponseDto } from './dto/recommendations-response.dto';
import { RecommendationsService } from './recommendations.service';

@ApiTags('Recommendations')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener recomendaciones personalizadas para el cliente autenticado',
    description:
      'Analiza compras y búsquedas recientes del cliente para generar sugerencias dinámicas. Si no hay historial suficiente, aplica un fallback a libros más vendidos o mejor posicionados.',
  })
  @ApiOkResponse({
    description: 'Recomendaciones personalizadas generadas exitosamente',
    type: RecommendationsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Token JWT inválido o expirado' })
  @ApiForbiddenResponse({ description: 'Solo los clientes pueden consultar recomendaciones' })
  async getRecommendations(
    @Req() req: { user: AuthenticatedUser },
  ): Promise<RecommendationsResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException('Solo los clientes pueden consultar recomendaciones');
    }

    return this.recommendationsService.getRecommendations(req.user.clientId);
  }

  @Post('bot')
  @ApiOperation({
    summary: 'Obtener recomendaciones mediante el bot de preferencias declaradas',
    description:
      'Acepta preferencias explícitas del cliente y devuelve un ranking de libros ajustado a esas señales, respetando el límite de respuesta del sistema.',
  })
  @ApiOkResponse({
    description: 'Recomendaciones del bot generadas exitosamente',
    type: RecommendationsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Preferencias inválidas' })
  @ApiUnauthorizedResponse({ description: 'Token JWT inválido o expirado' })
  @ApiForbiddenResponse({ description: 'Solo los clientes pueden consultar el bot de recomendaciones' })
  async getBotRecommendations(
    @Req() req: { user: AuthenticatedUser },
    @Body() payload: RecommendationBotRequestDto,
  ): Promise<RecommendationsResponseDto> {
    if (!req.user.clientId) {
      throw new ForbiddenException('Solo los clientes pueden consultar el bot de recomendaciones');
    }

    return this.recommendationsService.getBotRecommendations(req.user.clientId, payload);
  }
}