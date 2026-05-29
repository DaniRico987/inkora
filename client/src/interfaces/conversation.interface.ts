export type ConversationParticipantRole = 'client' | 'admin' | 'root';

export interface ConversationParticipant {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
    userType: ConversationParticipantRole;
}

export interface ConversationMessage {
    messageId: number;
    conversationId: number;
    senderId: number;
    content: string;
    sentAt: string;
    readAt?: string | null;
    isRead: boolean;
    sender: ConversationParticipant;
}

export interface ConversationSummary {
    conversationId: number;
    status: 'active' | 'closed';
    isQueued: boolean;
    startedAt: string;
    updatedAt: string;
    unreadCount: number;
    client: ConversationParticipant;
    admin: ConversationParticipant | null;
    lastAdmin: ConversationParticipant | null;
    lastMessage?: ConversationMessage | null;
}

export interface ConversationsResponse {
    conversations: ConversationSummary[];
}

export interface ConversationMessagesResponse {
    conversation: ConversationSummary;
    messages: ConversationMessage[];
}

export interface CreateConversationMessagePayload {
    content: string;
}

export interface ReadConversationMessageResponse {
    messageId: number;
    isRead: boolean;
    readAt?: string | null;
}
