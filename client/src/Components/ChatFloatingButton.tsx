import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { getConversations } from '../api/conversations';
import { getRoleFromToken, isAuthenticated } from '../auth/session';

export function ChatFloatingButton() {
    const navigate = useNavigate();
    const location = useLocation();
    const role = getRoleFromToken();
    const enabled = isAuthenticated() && (role === 'client' || role === 'admin');

    const conversationsQuery = useQuery({
        queryKey: ['chat-floating', 'conversations'],
        queryFn: getConversations,
        enabled,
        refetchInterval: 2000,
        refetchIntervalInBackground: true,
        staleTime: 0,
    });

    if (!enabled) {
        return null;
    }

    if (location.pathname === '/messages') {
        return null;
    }

    const unreadCount = (conversationsQuery.data?.conversations ?? []).reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
    );

    return (
        <button
            type="button"
            onClick={() => navigate('/messages')}
            className="fixed bottom-5 right-5 z-60 flex items-center gap-3 rounded-full border border-white/15 bg-primary-500 px-4 py-3 text-white shadow-2xl shadow-primary-500/30 transition hover:-translate-y-0.5 hover:bg-primary-400"
            aria-label="Abrir chat de mensajes"
            title="Abrir chat"
        >
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
    );
}
