import { Controller, Param, ParseIntPipe, Patch, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ConversationsService } from './conversations.service';
import { ReadMessageResponseDto } from './dto/read-message-response.dto';

@ApiTags('Conversations')
@ApiBearerAuth('JWT')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
    constructor(private readonly conversationsService: ConversationsService) { }

    @Patch(':id/read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Marcar un mensaje como leído',
    })
    @ApiResponse({
        status: 200,
        description: 'Mensaje marcado como leído',
        type: ReadMessageResponseDto,
    })
    @ApiNotFoundResponse({ description: 'Message not found' })
    @ApiUnauthorizedResponse({ description: 'Token JWT inválido o ausente' })
    async markAsRead(
        @Param('id', ParseIntPipe) messageId: number,
        @Req() req: Request & { user: AuthenticatedUser },
    ): Promise<ReadMessageResponseDto> {
        return this.conversationsService.markMessageAsRead(messageId, req.user);
    }
}