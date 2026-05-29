import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { getConversations } from '../api/conversations';
import { getRoleFromToken, isAuthenticated } from '../auth/session';
import { MessagesPage } from '../pages/MessagesPage';

export function ChatFloatingButton() {
    const navigate = useNavigate();
    const location = useLocation();
    const role = getRoleFromToken();
    const [clientChatOpen, setClientChatOpen] = useState(false);
    const enabled = isAuthenticated() && (role === 'client' || role === 'admin');

    const conversationsQuery = useQuery({
        queryKey: ['chat-floating', 'conversations'],
        queryFn: getConversations,
        enabled,
        refetchInterval: 2000,
        refetchIntervalInBackground: true,
        staleTime: 0,
    });

    useEffect(() => {
        if (role !== 'client') {
            return;
        }

        const params = new URLSearchParams(location.search);
        if (params.get('chat') !== 'open') {
            return;
        }

        setClientChatOpen(true);
        params.delete('chat');
        const nextSearch = params.toString();
        navigate(
            {
                pathname: location.pathname,
                search: nextSearch ? `?${nextSearch}` : '',
            },
            { replace: true },
        );
    }, [location.pathname, location.search, navigate, role]);

    if (!enabled) {
        return null;
    }

    if (role === 'admin' && location.pathname === '/messages') {
        return null;
    }

    const unreadCount = (conversationsQuery.data?.conversations ?? []).reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
    );

    const handleClick = () => {
        if (role === 'client') {
            setClientChatOpen((current) => !current);
            return;
        }

        navigate('/messages');
    };

    const showModal = role === 'client' && clientChatOpen;

    useEffect(() => {
        if (!showModal) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [showModal]);

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                className="fixed bottom-4 right-4 z-60 flex items-center gap-2 rounded-full border border-white/15 bg-primary-500 px-3 py-3 text-white shadow-2xl shadow-primary-500/30 transition hover:-translate-y-0.5 hover:bg-primary-400 sm:bottom-5 sm:right-5 sm:gap-3 sm:px-4 sm:py-3"
                aria-label="Abrir chat de mensajes"
                title="Abrir chat"
            >
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 sm:h-11 sm:w-11">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </span>
                <span className="hidden sm:block text-sm font-semibold">Chat</span>
            </button>

            {showModal && (
                <div className="fixed inset-0 z-70 flex items-stretch justify-stretch bg-black/35 p-0 sm:items-end sm:justify-end sm:p-4">
                    <div className="relative z-10 flex h-full w-full flex-col overflow-hidden rounded-none border-0 bg-bg-secondary shadow-2xl shadow-black/30 sm:h-auto sm:max-h-[75vh] sm:w-full sm:max-w-[90%] sm:rounded-3xl sm:border sm:border-border lg:max-w-[30%]">
                        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.25em] text-text-muted">Chat</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setClientChatOpen(false)}
                                className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text transition hover:border-primary-500 hover:text-primary-500"
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <MessagesPage embedded compact onClose={() => setClientChatOpen(false)} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
