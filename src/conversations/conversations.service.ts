import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateMessageRequestDto } from './dto/message.dto';
import { ConversationDto } from './dto/conversation.dto';
import { MessageDto } from './dto/message.dto';
import { ParticipantDto } from './dto/participant.dto';

type ConversationWithRelations = {
    conversationId: number;
    status: 'active' | 'closed';
    startedAt: Date;
    updatedAt: Date;
    client: {
        user: {
            userId: number;
            firstName: string;
            lastName: string;
            email: string;
            userType: 'client' | 'admin' | 'root';
        };
    };
    admin: {
        user: {
            userId: number;
            firstName: string;
            lastName: string;
            email: string;
            userType: 'client' | 'admin' | 'root';
        };
    };
    messages: Array<{
        messageId: number;
        conversationId: number;
        senderId: number;
        content: string;
        sentAt: Date;
        readAt: Date | null;
        isRead: boolean;
        sender: {
            userId: number;
            firstName: string;
            lastName: string;
            email: string;
            userType: 'client' | 'admin' | 'root';
        };
    }>;
};

type MessageWithSender = {
    messageId: number;
    conversationId: number;
    senderId: number;
    content: string;
    sentAt: Date;
    readAt: Date | null;
    isRead: boolean;
    sender: ConversationWithRelations['messages'][number]['sender'];
};

type MessageWithConversation = MessageWithSender & {
    conversation: ConversationWithRelations;
};

@Injectable()
export class ConversationsService {
    constructor(private readonly prisma: PrismaService) { }

    async createConversation(user: AuthenticatedUser): Promise<ConversationDto> {
        const client = await this.prisma.client.findUnique({
            where: { userId: user.userId },
            select: {
                clientId: true,
                user: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        userType: true,
                    },
                },
            },
        });

        if (!client) {
            throw new ForbiddenException('Solo los clientes pueden iniciar conversaciones');
        }

        const admin = await this.prisma.admin.findFirst({
            where: {
                user: {
                    status: 'active',
                    userType: 'admin',
                },
            },
            orderBy: { adminId: 'asc' },
            select: {
                adminId: true,
                user: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        userType: true,
                    },
                },
            },
        });

        if (!admin) {
            throw new NotFoundException('No hay administradores disponibles');
        }

        const conversation = (await this.prisma.conversation.create({
            data: {
                clientId: client.clientId,
                adminId: admin.adminId,
                status: 'active',
            },
            include: this.conversationInclude(),
        })) as unknown as ConversationWithRelations;

        await this.prisma.notification.create({
            data: {
                userId: admin.user.userId,
                notificationType: 'message',
                content: `Nueva conversación iniciada por ${client.user.firstName} ${client.user.lastName}`,
                isRead: false,
            },
        });

        return this.mapConversation(conversation, 0, null);
    }

    async listConversations(user: AuthenticatedUser): Promise<ConversationDto[]> {
        const scope = await this.getUserScope(user);

        const conversations = (await this.prisma.conversation.findMany({
            where:
                scope.kind === 'client'
                    ? { clientId: scope.clientId }
                    : { adminId: scope.adminId },
            include: this.conversationInclude(),
        })) as unknown as ConversationWithRelations[];

        conversations.sort((leftConversation, rightConversation) =>
            rightConversation.updatedAt.getTime() - leftConversation.updatedAt.getTime(),
        );

        return Promise.all(
            conversations.map(async (conversation) => {
                const unreadCount = await this.prisma.message.count({
                    where: {
                        conversationId: conversation.conversationId,
                        senderId: { not: user.userId },
                        isRead: false,
                    },
                });

                return this.mapConversation(
                    conversation,
                    unreadCount,
                    conversation.messages[0] ?? null,
                );
            }),
        );
    }

    async getConversationMessages(
        conversationId: number,
        user: AuthenticatedUser,
    ): Promise<{ conversation: ConversationDto; messages: MessageDto[] }> {
        const conversation = await this.findAccessibleConversation(conversationId, user.userId);

        const messages = (await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { sentAt: 'asc' },
            include: {
                sender: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        userType: true,
                    },
                },
            },
        })) as unknown as MessageWithSender[];

        const unreadCount = await this.prisma.message.count({
            where: {
                conversationId,
                senderId: { not: user.userId },
                isRead: false,
            },
        });

        return {
            conversation: this.mapConversation(
                conversation as ConversationWithRelations,
                unreadCount,
                messages.at(-1) ?? null,
            ),
            messages: messages.map((message) => this.mapMessage(message)),
        };
    }

    async sendMessage(
        conversationId: number,
        user: AuthenticatedUser,
        dto: CreateMessageRequestDto,
    ): Promise<MessageDto> {
        const conversation = await this.findAccessibleConversation(conversationId, user.userId);
        this.ensureParticipant(conversation, user.userId);

        const content = dto.content.trim();
        if (!content) {
            throw new ForbiddenException('El contenido del mensaje no puede estar vacío');
        }

        const message = (await this.prisma.message.create({
            data: {
                conversationId,
                senderId: user.userId,
                content,
            },
            include: {
                sender: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        userType: true,
                    },
                },
            },
        })) as unknown as MessageWithSender;

        await this.prisma.conversation.update({
            where: { conversationId },
            data: { status: 'active' },
        });

        const recipientUserId = this.getRecipientUserId(conversation, user.userId);
        const senderName = `${message.sender.firstName} ${message.sender.lastName}`.trim();

        await this.prisma.notification.create({
            data: {
                userId: recipientUserId,
                notificationType: 'message',
                content: `Nuevo mensaje de ${senderName}: ${message.content.slice(0, 160)}`,
                isRead: false,
            },
        });

        return this.mapMessage(message);
    }

    async markMessageAsRead(
        messageId: number,
        user: AuthenticatedUser,
    ): Promise<{ messageId: number; isRead: boolean; readAt: Date | null }> {
        const message = (await this.prisma.message.findUnique({
            where: { messageId },
            include: {
                conversation: {
                    include: this.conversationInclude(),
                },
                sender: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        userType: true,
                    },
                },
            },
        })) as unknown as MessageWithConversation | null;

        if (!message) {
            throw new NotFoundException('Message not found');
        }

        this.ensureParticipant(message.conversation as ConversationWithRelations, user.userId);

        if (message.senderId === user.userId) {
            throw new ForbiddenException('No puedes marcar como leído un mensaje enviado por ti');
        }

        if (message.isRead) {
            return { messageId: message.messageId, isRead: true, readAt: message.readAt };
        }

        const readAt = new Date();

        await this.prisma.$executeRaw`
      UPDATE "message"
      SET "isRead" = true,
          "readAt" = ${readAt}
      WHERE "messageId" = ${messageId}
    `;

        const updated = (await this.prisma.message.findUnique({
            where: { messageId },
            include: {
                sender: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        userType: true,
                    },
                },
            },
        })) as unknown as MessageWithSender | null;

        if (!updated) {
            throw new NotFoundException('Message not found');
        }

        return {
            messageId: updated.messageId,
            isRead: updated.isRead,
            readAt: updated.readAt,
        };
    }

    private async getUserScope(
        user: AuthenticatedUser,
    ): Promise<{ kind: 'client'; clientId: number } | { kind: 'admin'; adminId: number }> {
        if (user.userType === 'client') {
            const client = await this.prisma.client.findUnique({
                where: { userId: user.userId },
                select: { clientId: true },
            });

            if (!client) {
                throw new ForbiddenException('Cliente no encontrado');
            }

            return { kind: 'client', clientId: client.clientId };
        }

        if (user.userType === 'admin') {
            const admin = await this.prisma.admin.findUnique({
                where: { userId: user.userId },
                select: { adminId: true },
            });

            if (!admin) {
                throw new ForbiddenException('Administrador no encontrado');
            }

            return { kind: 'admin', adminId: admin.adminId };
        }

        throw new ForbiddenException('No tienes permisos para acceder a conversaciones privadas');
    }

    private async findAccessibleConversation(
        conversationId: number,
        userId: number,
    ): Promise<ConversationWithRelations> {
        const conversation = (await this.prisma.conversation.findUnique({
            where: { conversationId },
            include: this.conversationInclude(),
        })) as unknown as ConversationWithRelations | null;

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        this.ensureParticipant(conversation, userId);

        return conversation;
    }

    private ensureParticipant(conversation: ConversationWithRelations, userId: number): void {
        const clientUserId = conversation.client.user.userId;
        const adminUserId = conversation.admin.user.userId;

        if (userId !== clientUserId && userId !== adminUserId) {
            throw new NotFoundException('Conversation not found');
        }
    }

    private getRecipientUserId(conversation: ConversationWithRelations, senderUserId: number): number {
        if (conversation.client.user.userId === senderUserId) {
            return conversation.admin.user.userId;
        }

        if (conversation.admin.user.userId === senderUserId) {
            return conversation.client.user.userId;
        }

        throw new NotFoundException('Conversation not found');
    }

    private conversationInclude() {
        return {
            client: {
                include: {
                    user: {
                        select: {
                            userId: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            userType: true,
                        },
                    },
                },
            },
            admin: {
                include: {
                    user: {
                        select: {
                            userId: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            userType: true,
                        },
                    },
                },
            },
            messages: {
                orderBy: { sentAt: 'desc' as const },
                take: 1,
                include: {
                    sender: {
                        select: {
                            userId: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            userType: true,
                        },
                    },
                },
            },
        };
    }

    private mapParticipant(participant: {
        user: {
            userId: number;
            firstName: string;
            lastName: string;
            email: string;
            userType: 'client' | 'admin' | 'root';
        };
    }): ParticipantDto {
        return {
            userId: participant.user.userId,
            firstName: participant.user.firstName,
            lastName: participant.user.lastName,
            email: participant.user.email,
            userType: participant.user.userType,
        };
    }

    private mapMessage(message: {
        messageId: number;
        conversationId: number;
        senderId: number;
        content: string;
        sentAt: Date;
        readAt: Date | null;
        isRead: boolean;
        sender: {
            userId: number;
            firstName: string;
            lastName: string;
            email: string;
            userType: 'client' | 'admin' | 'root';
        };
    }): MessageDto {
        return {
            messageId: message.messageId,
            conversationId: message.conversationId,
            senderId: message.senderId,
            content: message.content,
            sentAt: message.sentAt,
            readAt: message.readAt,
            isRead: message.isRead,
            sender: {
                userId: message.sender.userId,
                firstName: message.sender.firstName,
                lastName: message.sender.lastName,
                email: message.sender.email,
                userType: message.sender.userType,
            },
        };
    }

    private mapConversation(
        conversation: ConversationWithRelations,
        unreadCount: number,
        lastMessage: ConversationWithRelations['messages'][number] | null,
    ): ConversationDto {
        return {
            conversationId: conversation.conversationId,
            status: conversation.status,
            startedAt: conversation.startedAt,
            updatedAt: conversation.updatedAt,
            unreadCount,
            client: this.mapParticipant(conversation.client),
            admin: this.mapParticipant(conversation.admin),
            lastMessage: lastMessage ? this.mapMessage(lastMessage) : null,
        };
    }
}