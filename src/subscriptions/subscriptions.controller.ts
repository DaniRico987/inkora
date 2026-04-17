import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscriptionDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('client')
@ApiBearerAuth('JWT')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Suscribirse a una categoría',
  })
  @ApiResponse({
    status: 201,
    description: 'Suscripción creada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoría no encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Ya está suscrito a esta categoría',
  })
  async subscribe(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: SubscribeDto,
  ): Promise<void> {
    await this.subscriptionsService.subscribe(req.user.userId, dto.categoryId);
  }

  @Delete(':categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desuscribirse de una categoría',
  })
  @ApiResponse({
    status: 204,
    description: 'Suscripción eliminada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Suscripción no encontrada',
  })
  async unsubscribe(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<void> {
    await this.subscriptionsService.unsubscribe(req.user.userId, categoryId);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar categorías suscritas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de suscripciones del cliente',
    type: [SubscriptionDto],
  })
  async getSubscriptions(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<SubscriptionDto[]> {
    return this.subscriptionsService.getSubscriptions(req.user.userId);
  }
}