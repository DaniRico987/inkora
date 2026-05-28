import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
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
    const adminName = `${conversation.admin.firstName} ${conversation.admin.lastName}`.trim();

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

function isOutgoing(message: ConversationMessage, role: 'client' | 'admin'): boolean {
    return message.sender.userType === role;
}

export function MessagesPage() {
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
    const pendingConversations = currentRole === 'admin'
        ? conversations.filter((conversation) => conversation.isQueued)
        : [];
    const activeConversations = currentRole === 'admin'
        ? conversations.filter((conversation) => !conversation.isQueued)
        : conversations;

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
    const isPendingAdminConversation = currentRole === 'admin' && activeConversation?.isQueued;

    useEffect(() => {
        if (!activeConversation) {
            return;
        }

        if (currentRole === 'admin' && activeConversation.isQueued) {
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

            const sender = currentRole === 'admin' ? activeConversation.admin : activeConversation.client;

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
    const pageShellClass = 'w-full px-4 py-4 sm:px-6 lg:px-8';

    const pageContent = (
        <div className={pageShellClass}>
            <div className="relative overflow-hidden rounded-4xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(145deg,rgba(10,15,28,0.95),rgba(18,24,38,0.92))] shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
                <div className="absolute -left-24 top-4 h-48 w-48 rounded-full bg-skyblue-500/20 blur-3xl" aria-hidden="true" />
                <div className="absolute -right-24 bottom-0 h-56 w-56 rounded-full bg-primary-500/20 blur-3xl" aria-hidden="true" />

                <div className="relative flex min-h-[calc(100vh-10rem)] flex-col lg:flex-row">
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
                            ) : activeConversations.length === 0 && pendingConversations.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-5 py-8 text-center text-sm text-babyblue-50/80">
                                    {role === 'admin'
                                        ? 'Todavía no tienes chats aceptados.'
                                        : 'No tienes conversaciones todavía. Inicia una nueva para contactar al equipo de administración.'}
                                </div>
                            ) : (
                                activeConversations.map((conversation) => {
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
                                                    {role === 'admin' && conversation.isQueued && (
                                                        <span className="mt-2 inline-flex rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-100">
                                                            Pendiente
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
                                })
                            )}
                        </div>

                        {hasError && (
                            <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                                {hasError.message}
                            </div>
                        )}
                    </aside>

                    <section className="flex min-h-[60vh] flex-1 flex-col bg-bg-secondary/40">
                        {activeConversation ? (
                            <>
                                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.25em] text-text-muted">Conversación activa</p>
                                        <h2 className="mt-1 text-xl font-semibold text-text">
                                            {conversationTitle(activeConversation, currentRole)}
                                        </h2>
                                        <p className="mt-1 text-sm text-text-muted">
                                            {activeConversation.isQueued
                                                ? 'Pendiente de aceptación'
                                                : activeConversation.status === 'active'
                                                    ? 'Abierta'
                                                    : 'Cerrada'} · Última actualización {formatTime(activeConversation.updatedAt)}
                                        </p>
                                    </div>
                                    <Link
                                        to="/"
                                        className="rounded-full border border-border bg-bg px-4 py-2 text-sm font-medium text-text transition hover:border-primary-500 hover:text-primary-500"
                                    >
                                        Volver al inicio
                                    </Link>
                                </header>

                                <div className="flex-1 overflow-hidden px-4 py-4 sm:px-6">
                                    <div className="flex h-full min-h-[48vh] flex-col rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] shadow-inner">
                                        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                                            {messagesQuery.isLoading ? (
                                                <div className="flex h-full min-h-[30vh] items-center justify-center">
                                                    <Spinner label="Cargando mensajes..." />
                                                </div>
                                            ) : conversationMessages.length === 0 ? (
                                                <div className="flex h-full min-h-[30vh] items-center justify-center text-center text-sm text-text-muted">
                                                    No hay mensajes en esta conversación. Escribe el primer mensaje.
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {conversationMessages.map((message) => {
                                                        const outgoing = isOutgoing(message, currentRole);
                                                        return (
                                                            <div key={message.messageId} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                                                                <div className={`max-w-[92%] rounded-3xl px-4 py-3 shadow-lg sm:max-w-[72%] ${outgoing
                                                                    ? 'bg-linear-to-br from-primary-500 to-primary-600 text-white'
                                                                    : 'border border-border bg-bg-secondary text-text'
                                                                    }`}>
                                                                    <div className="mb-1 flex items-center justify-between gap-4">
                                                                        <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${outgoing ? 'text-babyblue-100/80' : 'text-text-muted'}`}>
                                                                            {outgoing ? 'Tú' : role === 'admin' ? 'Cliente' : 'Administración'}
                                                                        </span>
                                                                        <span className={`text-[11px] ${outgoing ? 'text-babyblue-100/80' : 'text-text-muted'}`}>
                                                                            {formatShortTime(message.sentAt)}
                                                                        </span>
                                                                    </div>
                                                                    <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6">{message.content}</p>
                                                                    {message.readAt && outgoing && (
                                                                        <p className="mt-2 text-[11px] text-babyblue-100/80">Leído {formatShortTime(message.readAt)}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    <div ref={messagesEndRef} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="border-t border-white/10 bg-black/10 p-4 sm:p-5">
                                            {isPendingAdminConversation ? (
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
                                                <>
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                                        <label className="flex-1">
                                                            <span className="mb-2 block text-sm font-medium text-text-muted">Escribe tu mensaje</span>
                                                            <textarea
                                                                value={draft}
                                                                onChange={(event) => setDraft(event.target.value)}
                                                                placeholder="Cuéntanos en qué podemos ayudarte..."
                                                                rows={3}
                                                                className="min-h-28 w-full resize-none rounded-2xl border border-border bg-bg px-4 py-3 text-sm text-text outline-none transition placeholder:text-text-muted focus:border-primary-500"
                                                                maxLength={4000}
                                                            />
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={handleSend}
                                                            disabled={sendMessageMutation.isPending || draft.trim().length === 0}
                                                            className="inline-flex items-center justify-center rounded-2xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-400 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-14"
                                                        >
                                                            {sendMessageMutation.isPending ? 'Enviando...' : 'Enviar mensaje'}
                                                        </button>
                                                    </div>
                                                    <p className="mt-2 text-xs text-text-muted">
                                                        Los nuevos mensajes se actualizarán automáticamente cada 2 segundos.
                                                    </p>
                                                </>
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

    return role === 'admin' ? <AdminLayout>{pageContent}</AdminLayout> : pageContent;
}

export default MessagesPage;
