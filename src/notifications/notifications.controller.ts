import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NotificationsService } from './notifications.service';
import {
  GetNotificationsResponseDto,
  NotificationDto,
} from './dto/get-notifications.dto';
import { MarkReadResponseDto } from './dto/mark-read.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Request } from 'express';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('client')
@ApiBearerAuth('JWT')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    type: GetNotificationsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotifications(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<{ notifications: NotificationDto[] }> {
    const userId = req.user.userId;
    const notifications =
      await this.notificationsService.getUserNotifications(userId);
    return { notifications };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: MarkReadResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('id', ParseIntPipe) notificationId: number,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<MarkReadResponseDto> {
    const userId = req.user.userId;
    return await this.notificationsService.markAsRead(notificationId, userId);
  }
}
