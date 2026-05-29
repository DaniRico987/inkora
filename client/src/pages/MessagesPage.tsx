import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { AdminLayout } from '../Components/AdminLayout';
import { Spinner } from '../Components/Spinner';
import { useSnackbar } from '../Components/SnackbarProvider';
import { getRoleFromToken, isAuthenticated } from '../auth/session';
import {
    claimConversation,
    createConversation,
    getConversationMessages,
    getConversations,
    markConversationMessageAsRead,
    sendConversationMessage,
} from '../api/conversations';
import type {
    ConversationMessage,
    ConversationSummary,
} from '../interfaces/conversation.interface';

const POLLING_MS = 2000;

function formatTime(value?: string | null): string {
    if (!value) {
        return 'Sin fecha';
    }

    return new Date(value).toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}

function formatShortTime(value?: string | null): string {
    if (!value) {
        return '--:--';
    }

    return new Date(value).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function conversationTitle(conversation: ConversationSummary, role: 'client' | 'admin'): string {
    const clientName = `${conversation.client.firstName} ${conversation.client.lastName}`.trim();
    const adminParticipant = conversation.admin ?? conversation.lastAdmin;
    const adminName = adminParticipant
        ? `${adminParticipant.firstName} ${adminParticipant.lastName}`.trim()
        : '';

    if (role === 'admin') {
        return clientName.length > 0 ? clientName : 'Cliente';
    }

    return adminName.length > 0 ? adminName : 'Equipo de administración';
}

function conversationSubtitle(conversation: ConversationSummary, role: 'client' | 'admin'): string {
    if (!conversation.lastMessage) {
        return 'Sin mensajes aún';
    }

    const prefix = conversation.lastMessage.sender.userType === role
        ? 'Tú: '
        : role === 'admin'
            ? 'Cliente: '
            : 'Admin: ';

    return `${prefix}${conversation.lastMessage.content}`;
}

function conversationStateLabel(conversation: ConversationSummary): string {
    if (conversation.status === 'closed') {
        return 'offline';
    }

    if (conversation.admin === null) {
        return 'en espera';
    }

    return 'online';
}

function isOutgoing(message: ConversationMessage, role: 'client' | 'admin'): boolean {
    return message.sender.userType === role;
}

type SendIconState = 'disabled' | 'ready' | 'sending';

function SendMessageIcon({ state }: { state: SendIconState }) {
    const iconClassName = state === 'disabled'
        ? 'h-5 w-5 text-text-muted/50'
        : state === 'sending'
            ? 'h-5 w-5 text-babyblue-100 animate-pulse'
            : 'h-5 w-5 text-white';

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={iconClassName}
            aria-hidden="true"
        >
            <path
                d="M10.3009 13.6949L20.102 3.89742M10.5795 14.1355L12.8019 18.5804C13.339 19.6545 13.6075 20.1916 13.9458 20.3356C14.2394 20.4606 14.575 20.4379 14.8492 20.2747C15.1651 20.0866 15.3591 19.5183 15.7472 18.3818L19.9463 6.08434C20.2845 5.09409 20.4535 4.59896 20.3378 4.27142C20.2371 3.98648 20.013 3.76234 19.7281 3.66167C19.4005 3.54595 18.9054 3.71502 17.9151 4.05315L5.61763 8.2523C4.48114 8.64037 3.91289 8.83441 3.72478 9.15032C3.56153 9.42447 3.53891 9.76007 3.66389 10.0536C3.80791 10.3919 4.34498 10.6605 5.41912 11.1975L9.86397 13.42C10.041 13.5085 10.1295 13.5527 10.2061 13.6118C10.2742 13.6643 10.3352 13.7253 10.3876 13.7933C10.4468 13.87 10.491 13.9585 10.5795 14.1355Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

type MessagesPageProps = {
    embedded?: boolean;
    compact?: boolean;
    onClose?: () => void;
};

export function MessagesPage({ embedded = false, compact = false, onClose: _onClose }: MessagesPageProps = {}) {
    const role = getRoleFromToken();
    const currentRole: 'client' | 'admin' = role === 'admin' ? 'admin' : 'client';
    const queryClient = useQueryClient();
    const { error: showError, success } = useSnackbar();
    const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
    const [draft, setDraft] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const conversationsQuery = useQuery({
        queryKey: ['conversations'],
        queryFn: getConversations,
        refetchInterval: POLLING_MS,
        refetchIntervalInBackground: true,
        staleTime: 0,
        enabled: isAuthenticated(),
    });

    const conversations = conversationsQuery.data?.conversations ?? [];
    const showConversationList = currentRole === 'admin' && !compact;
    const pendingConversations = currentRole === 'admin'
        ? conversations.filter((conversation) => conversation.status === 'active' && conversation.admin === null)
        : [];
    const activeConversations = currentRole === 'admin'
        ? conversations.filter((conversation) => conversation.status === 'active' && conversation.admin !== null)
        : conversations;
    const historicalConversations = currentRole === 'admin'
        ? conversations.filter((conversation) => conversation.status === 'closed')
        : [];

    useEffect(() => {
        if (selectedConversationId === null && conversations.length > 0) {
            setSelectedConversationId(conversations[0].conversationId);
        }
    }, [conversations, selectedConversationId]);

    useEffect(() => {
        if (selectedConversationId === null) {
            return;
        }

        const exists = conversations.some((conversation) => conversation.conversationId === selectedConversationId);
        if (!exists && conversations.length > 0) {
            setSelectedConversationId(conversations[0].conversationId);
        }
    }, [conversations, selectedConversationId]);

    const activeConversation = useMemo(
        () => conversations.find((conversation) => conversation.conversationId === selectedConversationId) ?? conversations[0] ?? null,
        [conversations, selectedConversationId],
    );

    useEffect(() => {
        if (!activeConversation && conversations.length > 0) {
            setSelectedConversationId(conversations[0].conversationId);
        }
    }, [activeConversation, conversations]);

    const messagesQuery = useQuery({
        queryKey: ['conversations', activeConversation?.conversationId, 'messages'],
        queryFn: async () => {
            if (!activeConversation) {
                return null;
            }

            return getConversationMessages(activeConversation.conversationId);
        },
        enabled: Boolean(activeConversation),
        refetchInterval: activeConversation ? POLLING_MS : false,
        refetchIntervalInBackground: true,
        staleTime: 0,
    });

    const conversationMessages = messagesQuery.data?.messages ?? [];
    const isPendingAdminConversation = currentRole === 'admin'
        && (!activeConversation || activeConversation.status === 'closed' || activeConversation.admin === null);

    useEffect(() => {
        if (!activeConversation) {
            return;
        }

        if (currentRole === 'admin' && (activeConversation.status === 'closed' || activeConversation.admin === null)) {
            return;
        }

        const unreadIncoming = conversationMessages.filter(
            (message) => !message.isRead && message.sender.userType !== currentRole,
        );

        if (unreadIncoming.length === 0) {
            return;
        }

        void Promise.all(unreadIncoming.map((message) => markConversationMessageAsRead(message.messageId)))
            .then(() => {
                void queryClient.invalidateQueries({ queryKey: ['conversations'] });
                void queryClient.invalidateQueries({ queryKey: ['conversations', activeConversation.conversationId, 'messages'] });
            })
            .catch((error) => {
                console.error(error);
            });
    }, [activeConversation, conversationMessages, currentRole, queryClient]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [conversationMessages, activeConversation?.conversationId]);

    const createConversationMutation = useMutation({
        mutationFn: createConversation,
        onSuccess: async (conversation) => {
            await queryClient.invalidateQueries({ queryKey: ['conversations'] });
            setSelectedConversationId(conversation.conversationId);
            success('Conversación creada');
        },
        onError: (error) => {
            showError(error instanceof Error ? error.message : 'No se pudo crear la conversación');
        },
    });

    const sendMessageMutation = useMutation({
        mutationFn: async (content: string) => {
            if (!activeConversation) {
                throw new Error('No hay conversación activa');
            }

            return sendConversationMessage(activeConversation.conversationId, { content });
        },
        onMutate: async (content) => {
            if (!activeConversation) {
                return null;
            }

            await queryClient.cancelQueries({ queryKey: ['conversations', activeConversation.conversationId, 'messages'] });

            const previous = queryClient.getQueryData<{
                conversation: ConversationSummary;
                messages: ConversationMessage[];
            }>(['conversations', activeConversation.conversationId, 'messages']);

            const sender = currentRole === 'admin'
                ? activeConversation.admin ?? activeConversation.lastAdmin
                : activeConversation.client;

            if (!sender) {
                throw new Error('No hay un participante válido para este mensaje');
            }

            const optimisticMessage: ConversationMessage = {
                messageId: -Date.now(),
                conversationId: activeConversation.conversationId,
                senderId: sender.userId,
                content,
                sentAt: new Date().toISOString(),
                readAt: null,
                isRead: false,
                sender,
            };

            queryClient.setQueryData(
                ['conversations', activeConversation.conversationId, 'messages'],
                previous
                    ? {
                        ...previous,
                        messages: [...previous.messages, optimisticMessage],
                    }
                    : {
                        conversation: activeConversation,
                        messages: [optimisticMessage],
                    },
            );

            queryClient.setQueryData(['conversations'], (current: { conversations: ConversationSummary[] } | undefined) => {
                if (!current) {
                    return current;
                }

                return {
                    conversations: current.conversations.map((conversation) =>
                        conversation.conversationId === activeConversation.conversationId
                            ? {
                                ...conversation,
                                lastMessage: optimisticMessage,
                                updatedAt: optimisticMessage.sentAt,
                            }
                            : conversation,
                    ),
                };
            });

            return { previous };
        },
        onError: (error, _content, context) => {
            if (context?.previous) {
                queryClient.setQueryData(
                    ['conversations', activeConversation?.conversationId, 'messages'],
                    context.previous,
                );
            }

            showError(error instanceof Error ? error.message : 'No se pudo enviar el mensaje');
        },
        onSuccess: async () => {
            setDraft('');
            await queryClient.invalidateQueries({ queryKey: ['conversations'] });
            if (activeConversation) {
                await queryClient.invalidateQueries({ queryKey: ['conversations', activeConversation.conversationId, 'messages'] });
            }
        },
    });

    const claimConversationMutation = useMutation({
        mutationFn: claimConversation,
        onSuccess: async (conversation) => {
            await queryClient.invalidateQueries({ queryKey: ['conversations'] });
            await queryClient.invalidateQueries({ queryKey: ['conversations', conversation.conversationId, 'messages'] });
            setSelectedConversationId(conversation.conversationId);
            success('Conversación aceptada');
        },
        onError: (error) => {
            showError(error instanceof Error ? error.message : 'No se pudo aceptar la conversación');
        },
    });

    const handleSend = async () => {
        const content = draft.trim();
        if (!content || sendMessageMutation.isPending || isPendingAdminConversation) {
            return;
        }

        await sendMessageMutation.mutateAsync(content);
    };

    const handleDraftKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Enter' || event.shiftKey) {
            return;
        }

        event.preventDefault();

        if (draft.trim().length === 0 || sendMessageMutation.isPending || isPendingAdminConversation) {
            return;
        }

        await handleSend();
    };

    const isSendDisabled = sendMessageMutation.isPending || draft.trim().length === 0 || isPendingAdminConversation;
    const sendIconState: SendIconState = sendMessageMutation.isPending
        ? 'sending'
        : isSendDisabled
            ? 'disabled'
            : 'ready';

    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    if (role !== 'client' && role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    const isLoading = conversationsQuery.isLoading || messagesQuery.isLoading;
    const hasError = conversationsQuery.error instanceof Error
        ? conversationsQuery.error
        : messagesQuery.error instanceof Error
            ? messagesQuery.error
            : null;
    const pageShellClass = embedded
        ? 'h-full w-full overflow-hidden'
        : 'w-full px-4 py-4 sm:px-6 lg:px-8';
    const conversationShellClass = embedded
        ? 'relative flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_40%),linear-gradient(145deg,rgba(10,15,28,0.97),rgba(18,24,38,0.95))]'
        : 'relative overflow-hidden rounded-4xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(145deg,rgba(10,15,28,0.95),rgba(18,24,38,0.92))] shadow-[0_30px_80px_rgba(0,0,0,0.25)]';

    const pageContent = (
        <div className={pageShellClass}>
            <div className={conversationShellClass}>
                {!compact && (
                    <>
                        <div className="absolute -left-24 top-4 h-48 w-48 rounded-full bg-skyblue-500/20 blur-3xl" aria-hidden="true" />
                        <div className="absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-primary-500/20 blur-3xl" aria-hidden="true" />
                    </>
                )}

                <div className={`relative flex min-h-0 flex-1 flex-col ${showConversationList ? 'lg:flex-row' : ''}`}>
                    {showConversationList && (
                        <aside className="w-full border-b border-white/10 bg-black/10 p-4 sm:p-5 lg:w-95 lg:border-b-0 lg:border-r lg:border-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.3em] text-skyblue-200/70">Mensajería privada</p>
                                    <h1 className="mt-2 text-2xl font-semibold text-babyblue-50">
                                        {role === 'admin' ? 'Chats con clientes' : 'Tus conversaciones'}
                                    </h1>
                                </div>
                                {role === 'client' && (
                                    <button
                                        type="button"
                                        onClick={() => createConversationMutation.mutate()}
                                        disabled={createConversationMutation.isPending}
                                        className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-babyblue-50 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Nueva conversación
                                    </button>
                                )}
                            </div>

                            <div className="mt-5 space-y-3">
                                {role === 'admin' && pendingConversations.length > 0 && (
                                    <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-babyblue-50">Pendientes por aceptar</p>
                                                <p className="text-xs text-babyblue-50/70">
                                                    {pendingConversations.length} conversación(es) esperan atención.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 space-y-2">
                                            {pendingConversations.map((conversation) => (
                                                <div
                                                    key={conversation.conversationId}
                                                    className="rounded-2xl border border-white/10 bg-white/5 p-3"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-babyblue-50">
                                                                {conversationTitle(conversation, currentRole)}
                                                            </p>
                                                            <p className="mt-1 line-clamp-2 text-xs text-babyblue-50/70">
                                                                {conversationSubtitle(conversation, currentRole)}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => claimConversationMutation.mutate(conversation.conversationId)}
                                                            disabled={claimConversationMutation.isPending}
                                                            className="shrink-0 rounded-full bg-metallicgold-400 px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-metallicgold-300 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            Aceptar
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {conversationsQuery.isLoading ? (
                                    <div className="flex justify-center py-10">
                                        <Spinner size="md" label="Cargando conversaciones..." />
                                    </div>
                                ) : activeConversations.length === 0 && pendingConversations.length === 0 && historicalConversations.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-5 py-8 text-center text-sm text-babyblue-50/80">
                                        {role === 'admin'
                                            ? 'Todavía no tienes chats aceptados.'
                                            : 'No tienes conversaciones todavía. Inicia una nueva para contactar al equipo de administración.'}
                                    </div>
                                ) : (
                                    <>
                                        {activeConversations.map((conversation) => {
                                            const selected = conversation.conversationId === activeConversation?.conversationId;
                                            return (
                                                <button
                                                    key={conversation.conversationId}
                                                    type="button"
                                                    onClick={() => setSelectedConversationId(conversation.conversationId)}
                                                    className={`w-full rounded-2xl border p-4 text-left transition ${selected
                                                        ? 'border-skyblue-300 bg-skyblue-500/16 shadow-[0_0_0_1px_rgba(125,211,252,0.35)]'
                                                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-semibold text-babyblue-50">
                                                                {conversationTitle(conversation, currentRole)}
                                                            </p>
                                                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-babyblue-50/70">
                                                                {conversationSubtitle(conversation, currentRole)}
                                                            </p>
                                                            {role === 'admin' && conversation.status === 'active' && conversation.admin === null && (
                                                                <span className="mt-2 inline-flex rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-100">
                                                                    Pendiente
                                                                </span>
                                                            )}
                                                            {role === 'admin' && conversation.status === 'closed' && (
                                                                <span className="mt-2 inline-flex rounded-full border border-slate-300/20 bg-slate-100/10 px-2 py-0.5 text-[11px] font-semibold text-slate-100/80">
                                                                    Historial
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex shrink-0 flex-col items-end gap-2">
                                                            <span className="text-[11px] text-babyblue-50/55">
                                                                {formatTime(conversation.lastMessage?.sentAt ?? conversation.updatedAt)}
                                                            </span>
                                                            {conversation.unreadCount > 0 && (
                                                                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-metallicgold-400 px-2 py-0.5 text-[11px] font-bold text-primary-600">
                                                                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}

                                        {role === 'admin' && historicalConversations.length > 0 && (
                                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                                <p className="text-sm font-semibold text-babyblue-50">Historial cerrado</p>
                                                <p className="mt-1 text-xs text-babyblue-50/70">
                                                    Conversaciones anteriores disponibles para revisar y reclamar nuevamente.
                                                </p>

                                                <div className="mt-3 space-y-2">
                                                    {historicalConversations.map((conversation) => {
                                                        const selected = conversation.conversationId === activeConversation?.conversationId;
                                                        return (
                                                            <button
                                                                key={conversation.conversationId}
                                                                type="button"
                                                                onClick={() => setSelectedConversationId(conversation.conversationId)}
                                                                className={`w-full rounded-2xl border p-4 text-left transition ${selected
                                                                    ? 'border-skyblue-300 bg-skyblue-500/16 shadow-[0_0_0_1px_rgba(125,211,252,0.35)]'
                                                                    : 'border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/8'
                                                                    }`}
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-semibold text-babyblue-50">
                                                                            {conversationTitle(conversation, currentRole)}
                                                                        </p>
                                                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-babyblue-50/70">
                                                                            {conversationSubtitle(conversation, currentRole)}
                                                                        </p>
                                                                        <span className="mt-2 inline-flex rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-babyblue-50/70">
                                                                            Cerrada
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[11px] text-babyblue-50/55">
                                                                        {formatTime(conversation.lastMessage?.sentAt ?? conversation.updatedAt)}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {hasError && (
                                <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                                    {hasError.message}
                                </div>
                            )}
                        </aside>
                    )}

                    <section id="messages-section" className={`flex min-h-0 w-full flex-1 flex-col ${embedded ? 'bg-transparent max-h-[70vh]' : 'min-h-[60vh] bg-bg-secondary/40 max-h-[80vh]'}`}>
                        {activeConversation ? (
                            <>
                                <header className={`flex-none flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 ${embedded ? 'border-border bg-black/10' : activeConversation.status === 'closed' ? 'border-slate-200/10 bg-slate-100/5' : 'border-white/10'}`}>
                                    <div className="flex justify-between items-center w-full gap-3">
                                        <h2 className="mt-1 text-sm font-semibold text-text sm:text-base">
                                            {conversationTitle(activeConversation, currentRole)}
                                        </h2>
                                        <p className="mt-0.5 text-[11px] text-text-muted sm:text-xs">
                                            {conversationStateLabel(activeConversation)} · {formatTime(activeConversation.updatedAt)}
                                        </p>
                                    </div>
                                </header>

                                <div className="flex min-h-0 flex-1 overflow-hidden px-3 py-3 sm:px-4">
                                    <div className={`flex min-h-0 flex-1 flex-col ${embedded ? 'rounded-2xl border border-white/10 bg-black/10' : 'min-h-[48vh] rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] shadow-inner'}`}>
                                        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${embedded ? 'px-3 py-3' : 'px-4 py-5 sm:px-6'}`}>
                                            {messagesQuery.isLoading ? (
                                                <div className={`flex h-full items-center justify-center ${embedded ? 'min-h-48' : 'min-h-[30vh]'}`}>
                                                    <Spinner label="Cargando mensajes..." />
                                                </div>
                                            ) : conversationMessages.length === 0 ? (
                                                <div className={`flex h-full items-center justify-center text-center text-sm text-text-muted ${embedded ? 'min-h-48' : 'min-h-[30vh]'}`}>
                                                    No hay mensajes en esta conversación. Escribe el primer mensaje.
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {conversationMessages.map((message) => {
                                                        const outgoing = isOutgoing(message, currentRole);
                                                        return (
                                                            <div key={message.messageId} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                                                                <div className={`min-w-[40%] max-w-[92%] text-start rounded-3xl px-3 py-2.5 shadow-lg sm:max-w-[72%] ${outgoing
                                                                    ? 'bg-linear-to-br from-primary-500 to-primary-600 text-white'
                                                                    : 'border border-border bg-bg-secondary text-text'
                                                                    }`}>
                                                                    <p className="whitespace-pre-wrap wrap-break-word text-sm leading-5">{message.content}</p>
                                                                    <div className="mt-1 flex items-center justify-between gap-3">
                                                                        {message.readAt && outgoing && (
                                                                            <span className="text-[10px] text-babyblue-100/80">Leído</span>
                                                                        )}
                                                                        <span className={`text-[10px] ${outgoing ? 'text-babyblue-100/80' : 'text-text-muted'}`}>
                                                                            {formatShortTime(message.sentAt)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    <div ref={messagesEndRef} />
                                                </div>
                                            )}
                                        </div>

                                        <div className={`flex-none border-t border-white/10 bg-black/10 ${embedded ? 'p-3' : 'p-4 sm:p-5'}`}>
                                            {activeConversation.status === 'closed' && role === 'admin' ? (
                                                <div className="flex flex-col gap-2 rounded-2xl border border-slate-300/20 bg-slate-100/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold text-babyblue-50">Historial cerrado disponible</p>
                                                        <p className="text-xs text-babyblue-50/70">
                                                            Reclama la conversación para tomar la atención desde el último mensaje.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (activeConversation) {
                                                                claimConversationMutation.mutate(activeConversation.conversationId);
                                                            }
                                                        }}
                                                        disabled={claimConversationMutation.isPending}
                                                        className="inline-flex items-center justify-center rounded-2xl bg-metallicgold-400 px-6 py-3 text-sm font-semibold text-primary-700 transition hover:bg-metallicgold-300 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-14"
                                                    >
                                                        {claimConversationMutation.isPending ? 'Reclamando...' : 'Reclamar conversación'}
                                                    </button>
                                                </div>
                                            ) : isPendingAdminConversation ? (
                                                <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold text-babyblue-50">Conversación pendiente de aceptación</p>
                                                        <p className="text-xs text-babyblue-50/70">
                                                            Acepta la conversación para habilitar la respuesta.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (activeConversation) {
                                                                claimConversationMutation.mutate(activeConversation.conversationId);
                                                            }
                                                        }}
                                                        disabled={claimConversationMutation.isPending}
                                                        className="inline-flex items-center justify-center rounded-2xl bg-metallicgold-400 px-6 py-3 text-sm font-semibold text-primary-700 transition hover:bg-metallicgold-300 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-14"
                                                    >
                                                        {claimConversationMutation.isPending ? 'Aceptando...' : 'Aceptar conversación'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-end gap-3">
                                                    <label className="flex-1">
                                                        <textarea
                                                            value={draft}
                                                            onChange={(event) => setDraft(event.target.value)}
                                                            onKeyDown={handleDraftKeyDown}
                                                            placeholder="mensaje"
                                                            rows={embedded ? 1 : 2}
                                                            className={`w-full resize-none rounded-2xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition placeholder:text-text-muted focus:border-primary-500 ${embedded ? 'min-h-4' : 'min-h-8'}`}
                                                            maxLength={4000}
                                                        />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={handleSend}
                                                        disabled={isSendDisabled}
                                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:bg-bg disabled:text-text-muted sm:min-h-12"
                                                    >
                                                        <SendMessageIcon state={sendIconState} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center p-8">
                                {isLoading ? (
                                    <Spinner label="Preparando chat..." />
                                ) : (
                                    <div className="max-w-xl rounded-[1.75rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
                                        <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Sin conversación activa</p>
                                        <h2 className="mt-3 text-2xl font-semibold text-text">Empieza una conversación</h2>
                                        <p className="mt-3 text-sm leading-6 text-text-muted">
                                            {role === 'admin'
                                                ? 'Selecciona un chat asignado para responder al cliente.'
                                                : 'Crea una nueva conversación para hablar con el equipo de administración y ver el historial completo de mensajes.'}
                                        </p>
                                        {role === 'client' && (
                                            <button
                                                type="button"
                                                onClick={() => createConversationMutation.mutate()}
                                                className="mt-6 rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-400"
                                            >
                                                Iniciar conversación
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );

    if (!embedded && role === 'admin') {
        return <AdminLayout>{pageContent}</AdminLayout>;
    }

    return pageContent;
}

export default MessagesPage;
