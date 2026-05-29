import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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
        adminId: number;
        user: {
            userId: number;
            firstName: string;
            lastName: string;
            email: string;
            userType: 'client' | 'admin' | 'root';
        };
    } | null;
    lastAdmin: {
        adminId: number;
        user: {
            userId: number;
            firstName: string;
            lastName: string;
            email: string;
            userType: 'client' | 'admin' | 'root';
        };
    } | null;
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

const CONVERSATION_INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;
const CONVERSATION_RECLAIM_GRACE_MS = 30 * 60 * 1000;

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
    private readonly logger = new Logger(ConversationsService.name);

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

        const existingConversation = await this.findLatestConversationForClient(client.clientId);

        if (existingConversation) {
            const unreadCount = await this.prisma.message.count({
                where: {
                    conversationId: existingConversation.conversationId,
                    senderId: { not: user.userId },
                    isRead: false,
                },
            });

            return this.mapConversation(
                existingConversation,
                unreadCount,
                existingConversation.messages[0] ?? null,
            );
        }

        const activeAdmins = await this.prisma.admin.findMany({
            where: {
                user: {
                    status: 'active',
                    userType: 'admin',
                },
            },
            select: {
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

        if (activeAdmins.length === 0) {
            throw new NotFoundException('No hay administradores disponibles');
        }

        const conversation = (await this.prisma.conversation.create({
            data: {
                status: 'active',
                client: {
                    connect: {
                        clientId: client.clientId,
                    },
                },
            },
            include: this.conversationInclude(),
        })) as unknown as ConversationWithRelations;

        await this.notifyActiveAdmins(
            `Nueva conversación pendiente iniciada por ${client.user.firstName} ${client.user.lastName}`,
        );

        return this.mapConversation(conversation, 0, null);
    }

    async listConversations(user: AuthenticatedUser): Promise<ConversationDto[]> {
        const scope = await this.getUserScope(user);

        const clientConversation = scope.kind === 'client'
            ? await this.findLatestConversationForClient(scope.clientId)
            : null;

        const conversations = scope.kind === 'client'
            ? (clientConversation ? [clientConversation] : [])
            : ((await this.prisma.conversation.findMany({
                where: {
                    OR: [
                        { adminId: scope.adminId },
                        { adminId: null },
                    ],
                },
                include: this.conversationInclude(),
            })) as unknown as ConversationWithRelations[]);

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
        this.ensureCanReply(conversation, user.userId);

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

        const senderName = `${message.sender.firstName} ${message.sender.lastName}`.trim();

        if (conversation.admin === null && user.userType === 'client') {
            await this.notifyActiveAdmins(
                `Nuevo mensaje de ${senderName}: ${message.content.slice(0, 160)}`,
            );
        } else {
            const recipientUserId = this.getRecipientUserId(conversation, user.userId);

            await this.prisma.notification.create({
                data: {
                    userId: recipientUserId,
                    notificationType: 'message',
                    content: `Nuevo mensaje de ${senderName}: ${message.content.slice(0, 160)}`,
                    isRead: false,
                },
            });
        }

        return this.mapMessage(message);
    }

    async claimConversation(
        conversationId: number,
        user: AuthenticatedUser,
    ): Promise<ConversationDto> {
        const scope = await this.getUserScope(user);

        if (scope.kind !== 'admin') {
            throw new ForbiddenException('Solo los administradores pueden aceptar conversaciones');
        }

        const conversation = (await this.prisma.conversation.findUnique({
            where: { conversationId },
            include: this.conversationInclude(),
        })) as unknown as ConversationWithRelations | null;

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const refreshedConversation = await this.refreshConversationIfNeeded(conversation);

        if (refreshedConversation.admin !== null) {
            if (refreshedConversation.admin.user.userId === user.userId) {
                const unreadCount = await this.prisma.message.count({
                    where: {
                        conversationId,
                        senderId: { not: user.userId },
                        isRead: false,
                    },
                });

                return this.mapConversation(refreshedConversation, unreadCount, refreshedConversation.messages[0] ?? null);
            }

            throw new ForbiddenException('La conversación ya fue aceptada por otro administrador');
        }

        const updated = (await this.prisma.conversation.update({
            where: { conversationId },
            data: {
                adminId: scope.adminId,
                status: 'active',
            },
            include: this.conversationInclude(),
        })) as unknown as ConversationWithRelations;

        await this.prisma.notification.create({
            data: {
                userId: updated.client.user.userId,
                notificationType: 'message',
                content: `Tu conversación fue aceptada por ${updated.admin.user.firstName} ${updated.admin.user.lastName}`,
                isRead: false,
            },
        });

        return this.mapConversation(updated, 0, updated.messages[0] ?? null);
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

        if (!this.canViewConversation(message.conversation as ConversationWithRelations, user.userId)) {
            throw new NotFoundException('Conversation not found');
        }

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

        const refreshedConversation = await this.refreshConversationIfNeeded(conversation);

        if (!this.canViewConversation(refreshedConversation, userId)) {
            throw new NotFoundException('Conversation not found');
        }

        return refreshedConversation;
    }

    private isConversationExpired(conversation: ConversationWithRelations): boolean {
        const lastMessage = conversation.messages[0] ?? null;

        if (!lastMessage) {
            return false;
        }

        if (
            conversation.status === 'active'
            && conversation.admin !== null
            && Date.now() - conversation.updatedAt.getTime() < CONVERSATION_RECLAIM_GRACE_MS
        ) {
            return false;
        }

        return Date.now() - lastMessage.sentAt.getTime() >= CONVERSATION_INACTIVITY_TIMEOUT_MS;
    }

    private async refreshConversationIfNeeded(
        conversation: ConversationWithRelations,
    ): Promise<ConversationWithRelations> {
        if (!this.isConversationExpired(conversation) || conversation.status === 'closed') {
            return conversation;
        }

        const updated = (await this.prisma.conversation.update({
            where: { conversationId: conversation.conversationId },
            data: {
                status: 'closed',
                adminId: null,
                lastAdminId: conversation.admin?.adminId ?? conversation.lastAdmin?.adminId ?? null,
            },
            include: this.conversationInclude(),
        })) as unknown as ConversationWithRelations;

        return updated;
    }

    private ensureCanReply(conversation: ConversationWithRelations, userId: number): void {
        const clientUserId = conversation.client.user.userId;
        const adminUserId = conversation.admin?.user.userId ?? null;

        if (userId === clientUserId) {
            return;
        }

        if (adminUserId !== null && userId === adminUserId && conversation.admin !== null) {
            return;
        }

        if (adminUserId !== null && userId === adminUserId && conversation.admin === null) {
            throw new ForbiddenException('Debes aceptar la conversación antes de responder');
        }

        if (userId !== clientUserId && userId !== adminUserId) {
            throw new NotFoundException('Conversation not found');
        }
    }

    private canViewConversation(conversation: ConversationWithRelations, userId: number): boolean {
        if (conversation.client.user.userId === userId) {
            return true;
        }

        if (conversation.admin?.user.userId === userId) {
            return true;
        }

        return conversation.admin === null;
    }

    private getRecipientUserId(conversation: ConversationWithRelations, senderUserId: number): number {
        if (conversation.client.user.userId === senderUserId) {
            if (!conversation.admin) {
                throw new NotFoundException('Conversation not found');
            }

            return conversation.admin.user.userId;
        }

        if (conversation.admin?.user.userId === senderUserId) {
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
            },
            lastAdmin: {
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

    @Cron(CronExpression.EVERY_MINUTE)
    async closeInactiveConversationsCron(): Promise<void> {
        const conversations = (await this.prisma.conversation.findMany({
            where: {
                status: 'active',
            },
            include: this.conversationInclude(),
            orderBy: { conversationId: 'asc' },
        })) as unknown as ConversationWithRelations[];

        const expiredConversations = conversations.filter((conversation) =>
            this.isConversationExpired(conversation),
        );

        if (expiredConversations.length === 0) {
            return;
        }

        for (const conversation of expiredConversations) {
            try {
                await this.prisma.conversation.update({
                    where: { conversationId: conversation.conversationId },
                    data: {
                        status: 'closed',
                        adminId: null,
                        lastAdminId: conversation.admin?.adminId ?? conversation.lastAdmin?.adminId ?? null,
                    },
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`No se pudo cerrar la conversación ${conversation.conversationId}: ${message}`);
            }
        }

        this.logger.log(`Conversaciones cerradas por inactividad: ${expiredConversations.length}`);
    }

    private async findLatestConversationForClient(
        clientId: number,
    ): Promise<ConversationWithRelations | null> {
        const conversation = (await this.prisma.conversation.findFirst({
            where: { clientId },
            orderBy: [
                { updatedAt: 'desc' },
                { conversationId: 'desc' },
            ],
            include: this.conversationInclude(),
        })) as unknown as ConversationWithRelations | null;

        if (!conversation) {
            return null;
        }

        return this.refreshConversationIfNeeded(conversation);
    }

    private async notifyActiveAdmins(content: string): Promise<void> {
        const admins = await this.prisma.admin.findMany({
            where: {
                user: {
                    status: 'active',
                    userType: 'admin',
                },
            },
            select: {
                user: {
                    select: {
                        userId: true,
                    },
                },
            },
        });

        await Promise.all(
            admins.map((admin) =>
                this.prisma.notification.create({
                    data: {
                        userId: admin.user.userId,
                        notificationType: 'message',
                        content,
                        isRead: false,
                    },
                }),
            ),
        );
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
            isQueued: conversation.status === 'active' && conversation.admin === null,
            startedAt: conversation.startedAt,
            updatedAt: conversation.updatedAt,
            unreadCount,
            client: this.mapParticipant(conversation.client),
            admin: conversation.admin ? this.mapParticipant(conversation.admin) : null,
            lastAdmin: conversation.lastAdmin ? this.mapParticipant(conversation.lastAdmin) : null,
            lastMessage: lastMessage ? this.mapMessage(lastMessage) : null,
        };
    }
}