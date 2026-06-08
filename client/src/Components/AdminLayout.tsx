import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { getRoleFromToken, getAccessToken } from '../auth/session';
import { logoutSession } from '../auth/logoutSession';
import { getConversations } from '../api/conversations';
import { ProfileModal } from './ProfileModal';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  label: string;
  path: string;
  icon: string;
  roles: ('admin' | 'root')[];
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const token = getAccessToken();
  const role = getRoleFromToken(token);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setProfileModalOpen(false);

    try {
      await logoutSession({ reason: 'manual' });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const menuItems: MenuItem[] = role === 'root'
    ? [
      {
        label: 'Auditoria',
        path: '/admin/audit-logs',
        icon: '🧾',
        roles: ['root'],
      },
      {
        label: 'Administradores',
        path: '/admin/admins',
        icon: '👥',
        roles: ['root'],
      },
      {
        label: 'Crear Administrador',
        path: '/admin/create-admin',
        icon: '➕',
        roles: ['root'],
      },
    ]
    : [
      {
        label: 'Dashboard',
        path: '/admin',
        icon: '📊',
        roles: ['admin', 'root'],
      },
      {
        label: 'Libros',
        path: '/admin/books',
        icon: '📚',
        roles: ['admin', 'root'],
      },
      {
        label: 'Tiendas',
        path: '/admin/stores',
        icon: '🏪',
        roles: ['admin', 'root'],
      },
      {
        label: 'Mensajería',
        path: '/messages',
        icon: '💬',
        roles: ['admin', 'root'],
      },
      {
        label: 'Devoluciones',
        path: '/admin/returns',
        icon: '↩️',
        roles: ['admin', 'root'],
      },
    ];

  const visibleMenuItems = menuItems.filter(
    (item) => role && (role === 'admin' || role === 'root') && item.roles.includes(role as 'admin' | 'root')
  );

  const conversationsQuery = useQuery({
    queryKey: ['admin-layout', 'conversations'],
    queryFn: getConversations,
    enabled: role === 'admin',
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const unreadConversationCount = (conversationsQuery.data?.conversations ?? []).reduce(
    (total, conversation) => total + conversation.unreadCount,
    0,
  );

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-bg-secondary">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-bg-secondary border-r border-border z-40 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 md:static`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="px-6 py-6 border-b border-border">
            <h1 className="text-2xl font-bold text-primary-500">Admin Panel</h1>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
            {visibleMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)
                  ? 'bg-primary-500 text-white'
                  : 'text-text hover:bg-border'
                  }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                {item.path === '/messages' && unreadConversationCount > 0 && (
                  <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    {unreadConversationCount > 99 ? '99+' : unreadConversationCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border space-y-3">
            <p className="text-text-muted text-xs font-medium">
              {role === 'root' ? '🔐 Root' : '👤 Administrador'}
            </p>
            <div className="flex gap-2">
              {role === 'admin' && (
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                  <span>👤</span>
                  <span>Perfil</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`${role === 'admin' ? 'flex-1' : 'w-full'} px-4 py-2 rounded-lg bg-red-600/10 text-red-600 hover:bg-red-600/20 transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60`}
              >
                <span>🚪</span>
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="border-b border-border bg-bg-secondary px-4 md:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 hover:bg-border rounded-lg transition-colors"
          >
            <span className="text-2xl">☰</span>
          </button>
          <h2 className="text-lg font-semibold text-text hidden md:block">
            {visibleMenuItems.find((item) => isActive(item.path))?.label ||
              'Admin Panel'}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Panel Administrativo</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">{children}</div>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </div>
  );
}
