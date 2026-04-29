import './App.css';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Toggle } from './Components/Toggle';
import { NavBar, type NavBarVariant } from './Components/NavBar';
import { useTheme } from './theme/useTheme';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { CatalogPage } from './pages/catalog';
import { BookDetailPage } from './pages/BookDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { MyReservationsPage } from './pages/MyReservationsPage';
import { MyHistoryPage } from './pages/MyHistoryPage';
//import { ComponentsTestPage } from './pages/ComponentsTestPage';
import { SnackbarProvider } from './Components/SnackbarProvider';
import { NotificationsProvider } from './hooks/useNotifications';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/es';
import {
  getAccessToken,
  getIsTemporaryPasswordFromToken,
  getRoleFromToken,
} from './auth/session';
import { ClientHomePage } from './pages/ClientHomePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminChangePasswordPage } from './pages/AdminChangePasswordPage.tsx';
import { BooksManagementPage } from './pages/BooksManagementPage';
import { StoresManagementPage } from './pages/StoresManagementPage';
import { AdminsManagementPage } from './pages/AdminsManagementPage';
import { RootAdminCreationPage } from './pages/RootAdminCreationPage';
import { NewsPage } from './pages/NewsPage';

type AppRole = 'visitor' | 'client' | 'admin' | 'root';

function resolveAppRole(): AppRole {
  const token = getAccessToken();
  const role = getRoleFromToken(token);

  if (!token || !role) {
    return 'visitor';
  }

  if (role === 'client' || role === 'admin' || role === 'root') {
    return role;
  }

  return 'visitor';
}

function getRoleHome(role: AppRole): string {
  if (role === 'root') return '/admin/create-admin';
  if (role === 'admin') return '/admin';
  if (role === 'client') return '/';
  return '/catalog';
}

function AccessGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: AppRole[];
  children: React.ReactNode;
}) {
  const role = resolveAppRole();

  if (!allowedRoles.includes(role)) {
    return <Navigate to={getRoleHome(role)} replace />;
  }

  return <>{children}</>;
}

function ProtectedClientRoute() {
  const role = resolveAppRole();

  if (role === 'visitor') {
    return <Navigate to="/catalog" replace />;
  }

  if (role !== 'client') {
    return <Navigate to={getRoleHome(role)} replace />;
  }

  return <ClientHomePage />;
}

function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const role = resolveAppRole();

  if (role === 'visitor') {
    return <Navigate to="/catalog" replace />;
  }

  if (role !== 'admin') {
    return <Navigate to={getRoleHome(role)} replace />;
  }

  if (getIsTemporaryPasswordFromToken()) {
    return <Navigate to="/admin/change-password" replace />;
  }

  return <>{children}</>;
}

function AdminChangePasswordRoute() {
  const role = resolveAppRole();

  if (role === 'visitor') {
    return <Navigate to="/catalog" replace />;
  }

  if (role !== 'admin') {
    return <Navigate to={getRoleHome(role)} replace />;
  }

  if (!getIsTemporaryPasswordFromToken()) {
    return <Navigate to="/admin" replace />;
  }

  return <AdminChangePasswordPage />;
}

function PublicLoginRoute() {
  const role = resolveAppRole();

  if (role === 'visitor') {
    return <LoginPage />;
  }

  return <Navigate to={getRoleHome(role)} replace />;
}

function getNavBarVariant(): NavBarVariant {
  const token = getAccessToken();
  const role = getRoleFromToken(token);

  if (role === 'admin') {
    return 'admin';
  }

  if (role === 'client') {
    return 'client';
  }

  return 'visitor';
}

function AppContent() {
  const location = useLocation();
  const shouldHideNavBar =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/admin') ||
    location.pathname === '/forgot-password' ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname === '/create-admin';
  const hasTopNav = !shouldHideNavBar;
  const navBarVariant = getNavBarVariant();

  return (
    <div className="bg-bg w-screen min-h-screen flex flex-col transition-all duration-300 ease-in-out">
      {!shouldHideNavBar && <NavBar variant={navBarVariant} />}
      <header
        className={`relative pointer-events-none w-full ${shouldHideNavBar && location.pathname.startsWith('/admin') ? 'hidden' : ''}`}
      >
        <div
          className={`mx-auto w-full px-4 ${hasTopNav ? 'max-w-7xl pt-1 pb-2' : 'pt-4 pb-2'}`}
        >
          <div className="pointer-events-auto flex w-full justify-end">
            <Toggle />
          </div>
        </div>
      </header>
      <main
        className={`flex-1 ${location.pathname.startsWith('/admin') || location.pathname === '/checkout' || location.pathname === '/' ? '' : 'flex items-center justify-center'}`}
      >
        <Routes>
          {/* Login */}
          <Route path="/login" element={<PublicLoginRoute />} />

          {/* Visitante y cliente */}
          <Route
            path="/register"
            element={
              <AccessGuard allowedRoles={['visitor']}>
                <RegisterPage />
              </AccessGuard>
            }
          />
          <Route
            path="/catalog"
            element={
              <AccessGuard allowedRoles={['visitor', 'client']}>
                <CatalogPage />
              </AccessGuard>
            }
          />
          <Route
            path="/books/:id"
            element={
              <AccessGuard allowedRoles={['visitor', 'client']}>
                <BookDetailPage />
              </AccessGuard>
            }
          />

          {/* Cliente */}
          <Route path="/" element={<ProtectedClientRoute />} />
          <Route
            path="/cart"
            element={
              <AccessGuard allowedRoles={['client']}>
                <CartPage />
              </AccessGuard>
            }
          />
          <Route
            path="/checkout"
            element={
              <AccessGuard allowedRoles={['client']}>
                <CheckoutPage />
              </AccessGuard>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <AccessGuard allowedRoles={['client']}>
                <OrderTrackingPage />
              </AccessGuard>
            }
          />
          <Route
            path="/my-reservations"
            element={
              <AccessGuard allowedRoles={['client']}>
                <MyReservationsPage />
              </AccessGuard>
            }
          />
          <Route
            path="/my-history"
            element={
              <AccessGuard allowedRoles={['client']}>
                <MyHistoryPage />
              </AccessGuard>
            }
          />
          <Route
            path="/news"
            element={
              <AccessGuard allowedRoles={['client']}>
                <NewsPage />
              </AccessGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <AccessGuard allowedRoles={['client']}>
                <Navigate to="/" replace />
              </AccessGuard>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <AdminRouteGuard>
                <AdminDashboard />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/admin/change-password"
            element={<AdminChangePasswordRoute />}
          />

          {/* Root */}
          <Route
            path="/admin/create-admin"
            element={
              <AccessGuard allowedRoles={['root']}>
                <RootAdminCreationPage />
              </AccessGuard>
            }
          />

          {/* Permitidas para visitante y admin */}
          <Route
            path="/forgot-password"
            element={
              <AccessGuard allowedRoles={['visitor', 'admin']}>
                <ForgotPasswordPage />
              </AccessGuard>
            }
          />
          <Route
            path="/reset-password/:token"
            element={
              <AccessGuard allowedRoles={['visitor', 'admin']}>
                <ResetPasswordPage />
              </AccessGuard>
            }
          />

          {/* Admin */}
          <Route
            path="/admin/books"
            element={
              <AdminRouteGuard>
                <BooksManagementPage />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/admin/stores"
            element={
              <AdminRouteGuard>
                <StoresManagementPage />
              </AdminRouteGuard>
            }
          />
          <Route
            path="/admin/admins"
            element={
              <AccessGuard allowedRoles={['root']}>
                <AdminsManagementPage />
              </AccessGuard>
            }
          />

          {/* Fallback por rol */}
          <Route
            path="*"
            element={<Navigate to={getRoleHome(resolveAppRole())} replace />}
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  useTheme();
  return (
    <BrowserRouter>
      <NotificationsProvider>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <SnackbarProvider
            config={{
              position: 'top-center',
              maxVisible: 3,
              maxQueue: 20,
              dedupeWindowMs: 1500,
            }}
          >
            <AppContent />
          </SnackbarProvider>
        </LocalizationProvider>
      </NotificationsProvider>
    </BrowserRouter>
  );
}

export default App;
