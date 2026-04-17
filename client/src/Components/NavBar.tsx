import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearAccessToken } from '../auth/session';
import { CartIcon } from './CartIcon';

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
        ];
    }

    return [
        ...(variant === 'client'
            ? [
                  { label: 'Inicio', to: '/' },
                  { label: 'Catalogo', to: '/catalog' },
                { label: 'Mis reservas', to: '/my-reservations' },
                  { label: 'Novedades', to: '/catalog' },
                  { label: 'Tiendas', to: '/catalog' },
              ]
            : []),
    ];
}

export const NavBar: React.FC<NavBarProps> = ({ variant }) => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

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
        </div>
    );
};