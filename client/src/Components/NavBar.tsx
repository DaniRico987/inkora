import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logoutSession } from '../auth/logoutSession';
import { CartIcon } from './CartIcon';
import { UserProfileModal } from './UserProfileModal';
import { useNotifications } from '../hooks/useNotifications';

type NavBarItem = {
    label: string;
    to: string;
};

export type NavBarVariant = 'visitor' | 'client' | 'admin';

type NavBarProps = {
    variant: NavBarVariant;
};

function getNavItems(variant: NavBarVariant): NavBarItem[] {
    if (variant === 'visitor') {
        return [
            { label: 'Inicio', to: '/' },
            { label: 'Catalogo', to: '/catalog' },
            { label: 'Tiendas', to: '/stores' },
        ];
    }

    if (variant === 'client') {
        return [
            { label: 'Inicio', to: '/' },
            { label: 'Catalogo', to: '/catalog' },
            { label: 'Novedades', to: '/news' },
            { label: 'Tiendas', to: '/stores' },
        ];
    }

    return [];
}

export const NavBar: React.FC<NavBarProps> = ({ variant }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [userProfileModalOpen, setUserProfileModalOpen] = useState(false);
    const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    const { notifications, unreadCount, markAsRead, loading: notificationsLoading } = useNotifications();
    const navItems = useMemo(() => getNavItems(variant), [variant]);
    const showNotifications = variant === 'client' || variant === 'admin';

    const navItemClass =
        'relative px-1.5 py-0.5 text-babyblue-50/95 transition-colors duration-200 hover:text-metallicgold-100 after:absolute after:-bottom-1.5 after:left-1/2 after:h-2.5 after:w-[calc(100%+0.65rem)] after:-translate-x-1/2 after:rounded-full after:border-b-2 after:border-current after:opacity-0 after:transition-all after:duration-200 hover:after:opacity-100 hover:after:-bottom-1';
    const iconButtonClass =
        'rounded-lg p-2 text-babyblue-50/95 transition-colors duration-200 hover:bg-white/12 hover:text-metallicgold-100';
    const authLinkClass =
        'rounded-lg px-3 py-2 text-sm font-medium text-babyblue-50/95 transition-colors duration-200 hover:bg-white/12 hover:text-metallicgold-100';
    const authOriginState = {
        from: `${location.pathname}${location.search}${location.hash}`,
    };

    const handleLogout = async () => {
        if (isLoggingOut) {
            return;
        }

        setIsLoggingOut(true);
        setIsOpen(false);
        setUserProfileModalOpen(false);

        try {
            await logoutSession({ reason: 'manual' });
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleMobileLinkClick = () => {
        setIsOpen(false);
    };

    const handleNotificationClick = async (notificationId: number, notificationType: string, bookId?: number) => {
        await markAsRead(notificationId);
        setNotificationsDropdownOpen(false);

        if (notificationType === 'message') {
            if (variant === 'client') {
                const params = new URLSearchParams(location.search);
                params.set('chat', 'open');
                navigate(`${location.pathname}?${params.toString()}`);
                return;
            }

            navigate('/messages');
            return;
        }

        if (bookId) {
            navigate(`/books/${bookId}`);
            return;
        }

        navigate(variant === 'admin' ? '/messages' : '/news');
    };

    const handleViewAllNotifications = () => {
        setNotificationsDropdownOpen(false);
        navigate(variant === 'admin' ? '/messages' : '/news');
    };

    const renderNotificationsMenu = () => (
        <div className="relative" ref={notificationsRef}>
            <button
                type="button"
                onClick={() => setNotificationsDropdownOpen((current) => !current)}
                aria-label="Notificaciones"
                className={`${iconButtonClass} relative`}
                title="Notificaciones"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M15 17h5l-5 5v-5z" />
                    <path d="M13.5 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z" />
                    <path d="M9 12l2 2 4-4" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {notificationsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
                    <div className="border-b border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-900">Notificaciones</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notificationsLoading ? (
                            <div className="p-4 text-center text-gray-500">Cargando...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">No hay notificaciones</div>
                        ) : (
                            notifications.slice(0, 5).map((notification) => (
                                <button
                                    key={notification.notificationId}
                                    type="button"
                                    className={`w-full border-b border-gray-100 p-4 text-left hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50' : ''}`}
                                    onClick={() => handleNotificationClick(notification.notificationId, notification.notificationType, notification.bookId)}
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className="shrink-0">
                                            {notification.notificationType === 'message' ? (
                                                <div className="flex h-14 w-10 items-center justify-center rounded bg-sky-100 text-xs font-bold text-sky-600">
                                                    Chat
                                                </div>
                                            ) : notification.book?.coverUrl ? (
                                                <img
                                                    src={notification.book.coverUrl}
                                                    alt={notification.book.title}
                                                    className="h-14 w-10 rounded object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-14 w-10 items-center justify-center rounded bg-gray-200">
                                                    <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-gray-900">
                                                {notification.notificationType === 'message'
                                                    ? 'Nuevo mensaje'
                                                    : notification.news?.title || 'Nueva notificación'}
                                            </p>
                                            <p className="line-clamp-2 text-sm text-gray-600">{notification.content}</p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {new Date(notification.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="shrink-0">
                                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                    {notifications.length > 5 && (
                        <div className="border-t border-gray-200 p-4">
                            <button
                                type="button"
                                onClick={handleViewAllNotifications}
                                className="w-full text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                Ver todas las notificaciones
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setNotificationsDropdownOpen(false);
            }
        };

        if (notificationsDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [notificationsDropdownOpen]);

    return (
        <div className="w-full h-24 sm:h-28 z-100">
            <nav className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-5 pt-3 sm:pt-4">
                <div className="mx-auto max-w-7xl rounded-2xl border border-white/90 bg-primary-400 shadow-xl">
                    <div className="relative flex h-16 items-center justify-between px-4 sm:px-6">
                        <div className="min-w-28 shrink-0 text-left flex items-center justify-center">
                            <Link
                                to={variant === 'admin' ? '/admin' : '/'}
                                className="flex items-center justify-center gap-2 text-xl font-semibold tracking-wide text-babyblue-50 sm:text-2xl"
                            >
                                INKORA
                            </Link>
                        </div>

                        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-4 text-sm font-medium md:flex xl:gap-7 sm:text-base">
                            {navItems.map((item) => (
                                <Link key={item.label} to={item.to} className={navItemClass}>
                                    {item.label}
                                </Link>
                            ))}
                        </div>

                        <div className="hidden min-w-28 items-center justify-end gap-2 lg:flex lg:gap-3">
                            <Link
                                to={variant === 'visitor' ? '/' : '/catalog'}
                                aria-label={variant === 'visitor' ? 'Ir al inicio' : 'Ir al catálogo'}
                                className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/12 p-2 text-babyblue-50 transition hover:bg-white/18 hover:text-metallicgold-100"
                                title={variant === 'visitor' ? 'Inicio' : 'Catálogo'}
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <circle cx="11" cy="11" r="7" />
                                    <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                                </svg>
                            </Link>

                            {variant === 'visitor' && (
                                <>
                                    <Link to="/login" state={authOriginState} className={authLinkClass}>
                                        Iniciar sesion
                                    </Link>
                                    <Link to="/register" state={authOriginState} className={authLinkClass}>
                                        Registrarse
                                    </Link>
                                </>
                            )}

                            {variant === 'client' && (
                                <>
                                    <Link to="/cart" aria-label="Carrito" className={iconButtonClass}>
                                        <CartIcon />
                                    </Link>
                                    {showNotifications && renderNotificationsMenu()}
                                    <button
                                        type="button"
                                        onClick={() => setUserProfileModalOpen(true)}
                                        aria-label="Abrir perfil"
                                        className={iconButtonClass}
                                        title="Mi Perfil"
                                    >
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    </button>
                                    <button type="button" onClick={handleLogout} disabled={isLoggingOut} className={authLinkClass}>
                                        Cerrar sesion
                                    </button>
                                </>
                            )}

                            {variant === 'admin' && (
                                <>
                                    {showNotifications && renderNotificationsMenu()}
                                    <button type="button" onClick={handleLogout} disabled={isLoggingOut} className={authLinkClass}>
                                        Cerrar sesion
                                    </button>
                                </>
                            )}
                        </div>

                        {variant !== 'admin' && (
                            <button
                                type="button"
                                onClick={() => setIsOpen((current) => !current)}
                                className="inline-flex items-center justify-center rounded-lg p-2 text-babyblue-50/95 hover:bg-white/12 lg:hidden"
                                aria-expanded={isOpen}
                                aria-label="Abrir menu"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {variant !== 'admin' && isOpen && (
                        <div className="border-t border-white/20 px-4 pb-4 pt-3 lg:hidden">
                            <div className="flex flex-col gap-2 text-left text-babyblue-50">
                                {navItems.map((item) => (
                                    <Link
                                        key={`mobile-${item.label}`}
                                        to={item.to}
                                        onClick={handleMobileLinkClick}
                                        className="rounded-md px-2 py-2 hover:bg-white/12"
                                    >
                                        {item.label}
                                    </Link>
                                ))}

                                {variant === 'visitor' && (
                                    <>
                                        <Link to="/login" state={authOriginState} onClick={handleMobileLinkClick} className="rounded-md px-2 py-2 hover:bg-white/12">
                                            Iniciar sesion
                                        </Link>
                                        <Link to="/register" state={authOriginState} onClick={handleMobileLinkClick} className="rounded-md px-2 py-2 hover:bg-white/12">
                                            Registrarse
                                        </Link>
                                    </>
                                )}

                                {variant === 'client' && (
                                    <>
                                        <Link to="/cart" onClick={handleMobileLinkClick} className="rounded-md px-2 py-2 hover:bg-white/12">
                                            Carrito
                                        </Link>
                                        <Link to="/news" onClick={handleMobileLinkClick} className="rounded-md px-2 py-2 hover:bg-white/12">
                                            Notificaciones
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUserProfileModalOpen(true);
                                                handleMobileLinkClick();
                                            }}
                                            className="rounded-md px-2 py-2 text-left hover:bg-white/12"
                                        >
                                            Mi Perfil
                                        </button>
                                    </>
                                )}

                                {variant !== 'visitor' && (
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                        className="rounded-md px-2 py-2 text-left hover:bg-white/12 disabled:opacity-60"
                                    >
                                        Cerrar sesion
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            <UserProfileModal
                isOpen={userProfileModalOpen}
                onClose={() => setUserProfileModalOpen(false)}
            />
        </div>
    );
};
