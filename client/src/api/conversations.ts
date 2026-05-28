import axios from 'axios';
import { AxiosHeaders } from 'axios';
import { getAccessToken } from '../auth/session';
import type {
    ConversationMessagesResponse,
    ConversationsResponse,
    ConversationSummary,
    CreateConversationMessagePayload,
    ConversationMessage,
    ReadConversationMessageResponse,
} from '../interfaces/conversation.interface';

const api = axios.create({
    baseURL: '/api/v1',
});

api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers = AxiosHeaders.from(config.headers);
        config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
});

function normalizeError(error: unknown, fallback: string): Error {
    if (axios.isAxiosError(error)) {
        const payload = error.response?.data as { message?: string | string[] } | undefined;
        const message = payload?.message;

        if (Array.isArray(message)) {
            return new Error(message.join(', '));
        }

        if (typeof message === 'string' && message.trim().length > 0) {
            return new Error(message);
        }

        return new Error(error.response?.data?.message ?? fallback);
    }

    if (error instanceof Error) {
        return error;
    }

    return new Error(fallback);
}

export function extractConversationError(error: unknown): Error {
    return normalizeError(error, 'No se pudo cargar la mensajería');
}

export async function getConversations(): Promise<ConversationsResponse> {
    try {
        const response = await api.get<ConversationsResponse>('/conversations');
        return response.data;
    } catch (error) {
        throw extractConversationError(error);
    }
}

export async function createConversation(): Promise<ConversationSummary> {
    try {
        const response = await api.post<ConversationSummary>('/conversations');
        return response.data;
    } catch (error) {
        throw extractConversationError(error);
    }
}

export async function getConversationMessages(
    conversationId: number,
): Promise<ConversationMessagesResponse> {
    try {
        const response = await api.get<ConversationMessagesResponse>(`/conversations/${conversationId}/messages`);
        return response.data;
    } catch (error) {
        throw extractConversationError(error);
    }
}

export async function sendConversationMessage(
    conversationId: number,
    payload: CreateConversationMessagePayload,
): Promise<ConversationMessage> {
    try {
        const response = await api.post<ConversationMessage>(`/conversations/${conversationId}/messages`, payload);
        return response.data;
    } catch (error) {
        throw extractConversationError(error);
    }
}

export async function claimConversation(conversationId: number): Promise<ConversationSummary> {
    try {
        const response = await api.post<ConversationSummary>(`/conversations/${conversationId}/claim`);
        return response.data;
    } catch (error) {
        throw extractConversationError(error);
    }
}

export async function markConversationMessageAsRead(
    messageId: number,
): Promise<ReadConversationMessageResponse> {
    try {
        const response = await api.patch<ReadConversationMessageResponse>(`/messages/${messageId}/read`);
        return response.data;
    } catch (error) {
        throw extractConversationError(error);
    }
}
