import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearAccessToken } from '../auth/session';
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
            { label: 'Inicio', to: '/catalog' },
            { label: 'Catalogo', to: '/catalog' },
            { label: 'Tiendas', to: '/stores' },
        ];
    }

    return [
        ...(variant === 'client'
            ? [
                  { label: 'Inicio', to: '/' },
                  { label: 'Catalogo', to: '/catalog' },
                  { label: 'Mis reservas', to: '/my-reservations' },
                  { label: 'Mi historial', to: '/my-history' },
                  { label: 'Mi perfil', to: '/profile' },
                  { label: 'Novedades', to: '/news' },
                  { label: 'Tiendas', to: '/stores' },
              ]
            : []),
    ];
}

export const NavBar: React.FC<NavBarProps> = ({ variant }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [userProfileModalOpen, setUserProfileModalOpen] = useState(false);
    const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();

    const { notifications, unreadCount, markAsRead, loading: notificationsLoading } = useNotifications();

    const navItems = useMemo(() => getNavItems(variant), [variant]);

    const navItemClass =
        'relative px-1.5 py-0.5 text-babyblue-50/95 transition-colors duration-200 hover:text-metallicgold-100 after:absolute after:-bottom-1.5 after:left-1/2 after:h-2.5 after:w-[calc(100%+0.65rem)] after:-translate-x-1/2 after:rounded-full after:border-b-2 after:border-current after:opacity-0 after:transition-all after:duration-200 hover:after:opacity-100 hover:after:-bottom-1';
    const iconButtonClass =
        'rounded-lg p-2 text-babyblue-50/95 transition-colors duration-200 hover:bg-white/12 hover:text-metallicgold-100';
    const authLinkClass =
        'rounded-lg px-3 py-2 text-sm font-medium text-babyblue-50/95 transition-colors duration-200 hover:bg-white/12 hover:text-metallicgold-100';
    const authOriginState = {
        from: `${location.pathname}${location.search}${location.hash}`,
    };

    const handleLogout = () => {
        clearAccessToken();
        setIsOpen(false);
        navigate('/login', { replace: true });
    };

    const handleMobileLinkClick = () => {
        setIsOpen(false);
    };

    const handleNotificationClick = async (notificationId: number, bookId?: number) => {
        await markAsRead(notificationId);
        setNotificationsDropdownOpen(false);
        if (bookId) {
            navigate(`/books/${bookId}`);
        } else {
            navigate('/news');
        }
    };

    const handleViewAllNotifications = () => {
        setNotificationsDropdownOpen(false);
        navigate('/news');
    };

    // Cerrar dropdown de notificaciones al hacer clic fuera
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
                <div className="max-w-7xl mx-auto rounded-2xl border border-white/90 bg-primary-400 shadow-xl">
                    <div className="relative flex items-center justify-between h-16 px-4 sm:px-6">
                        <div className="shrink-0 min-w-28 text-left flex justify-center items-center">
                            <Link
                                to={variant === 'admin' ? '/admin' : '/'}
                                className="text-xl sm:text-2xl gap-2 font-semibold flex justify-center item-center tracking-wide text-babyblue-50"
                            >
                                {/*<img src="/inkoraICO.svg" alt="Inkora Logo" className="w-8 h-auto" />*/}
                                INKORA
                            </Link>
                        </div>

                        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-4 lg:gap-7 text-sm sm:text-base font-medium">
                            {navItems.map((item) => (
                                <Link key={item.label} to={item.to} className={navItemClass}>
                                    {item.label}
                                </Link>
                            ))}
                        </div>

                        <div className="flex items-center justify-end gap-1 sm:gap-2 min-w-28">
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
                                    <Link to="/" aria-label="Buscar" className={iconButtonClass}>
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                            <circle cx="11" cy="11" r="7" />
                                            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                                        </svg>
                                    </Link>
                                    <Link to="/cart" aria-label="Carrito" className={iconButtonClass}>
                                        <CartIcon />
                                    </Link>
                                    <div className="relative" ref={notificationsRef}>
                                        <button
                                            type="button"
                                            onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)}
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
                                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </span>
                                            )}
                                        </button>

                                        {notificationsDropdownOpen && (
                                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                                                <div className="p-4 border-b border-gray-200">
                                                    <h3 className="text-sm font-medium text-gray-900">Notificaciones</h3>
                                                </div>
                                                <div className="max-h-96 overflow-y-auto">
                                                    {notificationsLoading ? (
                                                        <div className="p-4 text-center text-gray-500">Cargando...</div>
                                                    ) : notifications.length === 0 ? (
                                                        <div className="p-4 text-center text-gray-500">No hay notificaciones</div>
                                                    ) : (
                                                        notifications.slice(0, 5).map((notification) => (
                                                            <div
                                                                key={notification.notificationId}
                                                                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                                                                    !notification.isRead ? 'bg-blue-50' : ''
                                                                }`}
                                                                onClick={() => handleNotificationClick(notification.notificationId, notification.bookId)}
                                                            >
                                                                <div className="flex items-start space-x-3">
                                                                    <div className="flex-shrink-0">
                                                                        {notification.book?.coverUrl ? (
                                                                            <img
                                                                                src={notification.book.coverUrl}
                                                                                alt={notification.book.title}
                                                                                className="w-10 h-14 object-cover rounded"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center">
                                                                                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                                                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                                                </svg>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-gray-900 truncate">
                                                                            {notification.news?.title || 'Nueva notificación'}
                                                                        </p>
                                                                        <p className="text-sm text-gray-600 line-clamp-2">
                                                                            {notification.content}
                                                                        </p>
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                            {new Date(notification.createdAt).toLocaleDateString()}
                                                                        </p>
                                                                    </div>
                                                                    {!notification.isRead && (
                                                                        <div className="flex-shrink-0">
                                                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                                {notifications.length > 5 && (
                                                    <div className="p-4 border-t border-gray-200">
                                                        <button
                                                            onClick={handleViewAllNotifications}
                                                            className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
                                                        >
                                                            Ver todas las notificaciones
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setUserProfileModalOpen(true)}
                                        aria-label="Abrir perfil"
                                        className={iconButtonClass}
                                        title="Mi Perfil"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    </button>
                                    <button type="button" onClick={handleLogout} className={authLinkClass}>
                                        Cerrar sesion
                                    </button>
                                </>
                            )}

                            {variant === 'admin' && (
                                <button type="button" onClick={handleLogout} className={authLinkClass}>
                                    Cerrar sesion
                                </button>
                            )}

                            {variant !== 'admin' && (
                                <button
                                    onClick={() => setIsOpen((prev) => !prev)}
                                    className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-babyblue-50/95 hover:bg-white/12"
                                    aria-expanded={isOpen}
                                    aria-label="Abrir menu"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {variant !== 'admin' && isOpen && (
                        <div className="md:hidden border-t border-white/20 px-4 pb-4 pt-3">
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
                                )}

                                {variant !== 'visitor' && (
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="rounded-md px-2 py-2 text-left hover:bg-white/12"
                                    >
                                        Cerrar sesion
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </nav>
            
            {/* User Profile Modal */}
            <UserProfileModal
                isOpen={userProfileModalOpen}
                onClose={() => setUserProfileModalOpen(false)}
            />
        </div>
    );
};