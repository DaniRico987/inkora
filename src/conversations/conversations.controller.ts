import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOperation,
    ApiResponse,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { ConversationsService } from './conversations.service';
import { CreateMessageRequestDto } from './dto/message.dto';
import { ConversationDto, ConversationListResponseDto, ConversationMessagesResponseDto } from './dto/conversation.dto';

@ApiTags('Conversations')
@ApiBearerAuth('JWT')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
    constructor(private readonly conversationsService: ConversationsService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('client')
    @ApiOperation({
        summary: 'Iniciar una nueva conversación privada con administración',
    })
    @ApiResponse({
        status: 201,
        description: 'Conversación creada exitosamente',
        type: ConversationDto,
    })
    @ApiUnauthorizedResponse({ description: 'Token JWT inválido o ausente' })
    @ApiForbiddenResponse({ description: 'Solo los clientes pueden iniciar conversaciones' })
    async createConversation(
        @Req() req: Request & { user: AuthenticatedUser },
    ): Promise<ConversationDto> {
        return this.conversationsService.createConversation(req.user);
    }

    @Get()
    @ApiOperation({
        summary: 'Listar conversaciones del usuario autenticado',
    })
    @ApiResponse({
        status: 200,
        description: 'Lista de conversaciones',
        type: ConversationListResponseDto,
    })
    @ApiUnauthorizedResponse({ description: 'Token JWT inválido o ausente' })
    @ApiForbiddenResponse({ description: 'No tienes permisos para ver conversaciones privadas' })
    async listConversations(
        @Req() req: Request & { user: AuthenticatedUser },
    ): Promise<ConversationListResponseDto> {
        const conversations = await this.conversationsService.listConversations(req.user);
        return { conversations };
    }

    @Get(':id/messages')
    @ApiOperation({
        summary: 'Obtener el historial completo de mensajes de una conversación',
    })
    @ApiResponse({
        status: 200,
        description: 'Mensajes de la conversación',
        type: ConversationMessagesResponseDto,
    })
    @ApiNotFoundResponse({ description: 'Conversation not found' })
    @ApiUnauthorizedResponse({ description: 'Token JWT inválido o ausente' })
    async getMessages(
        @Param('id', ParseIntPipe) conversationId: number,
        @Req() req: Request & { user: AuthenticatedUser },
    ): Promise<ConversationMessagesResponseDto> {
        return this.conversationsService.getConversationMessages(conversationId, req.user);
    }

    @Post(':id/messages')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Enviar un mensaje dentro de una conversación',
    })
    @ApiBody({
        type: CreateMessageRequestDto,
        examples: {
            default: {
                summary: 'Mensaje de ejemplo',
                value: {
                    content: 'Hola, necesito ayuda con el estado de mi suscripción.',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Mensaje enviado exitosamente',
    })
    @ApiNotFoundResponse({ description: 'Conversation not found' })
    @ApiUnauthorizedResponse({ description: 'Token JWT inválido o ausente' })
    async sendMessage(
        @Param('id', ParseIntPipe) conversationId: number,
        @Body() dto: CreateMessageRequestDto,
        @Req() req: Request & { user: AuthenticatedUser },
    ) {
        return this.conversationsService.sendMessage(conversationId, req.user, dto);
    }
}