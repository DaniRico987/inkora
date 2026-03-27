import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toggle } from './Components/Toggle';
import { NavBar, type NavBarVariant } from './Components/NavBar';
import { useTheme } from './theme/useTheme';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { CatalogPage } from './pages/catalog';
//import { ComponentsTestPage } from './pages/ComponentsTestPage';
import { SnackbarProvider } from './Components/SnackbarProvider';
import { getAccessToken, getRoleFromToken } from './auth/session';
import { ClientHomePage } from './pages/ClientHomePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { BooksManagementPage } from './pages/BooksManagementPage';
import { StoresManagementPage } from './pages/StoresManagementPage';
import { AdminsManagementPage } from './pages/AdminsManagementPage';
import { RootAdminCreationPage } from './pages/RootAdminCreationPage';

function ProtectedClientRoute() {
  const token = getAccessToken();
  const role = getRoleFromToken(token);

  if (!token || !role) {
    return <Navigate to="/catalog" replace />;
  }

  if (role === 'admin' || role === 'root') {
    return <Navigate to="/admin" replace />;
  }

  return <ClientHomePage />;
}

function ProtectedAdminRoute() {
  const token = getAccessToken();
  const role = getRoleFromToken(token);

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'admin' && role !== 'root') {
    return <Navigate to="/" replace />;
  }

  // Redirect root users to admin creation page instead of dashboard
  if (role === 'root') {
    return <Navigate to="/admin/create-admin" replace />;
  }

  return <AdminDashboard />;
}

function ProtectedAdminSubRoute({ element }: { element: React.ReactNode }) {
  const token = getAccessToken();
  const role = getRoleFromToken(token);

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'admin' && role !== 'root') {
    return <Navigate to="/" replace />;
  }

  return <>{element}</>;
}

function ProtectedAdminOnlyRoute({ element }: { element: React.ReactNode }) {
  const token = getAccessToken();
  const role = getRoleFromToken(token);

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <>{element}</>;
}

function ProtectedRootOnlyRoute({ element }: { element: React.ReactNode }) {
  const token = getAccessToken();
  const role = getRoleFromToken(token);

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'root') {
    return <Navigate to="/admin" replace />;
  }

  return <>{element}</>;
}

function PublicLoginRoute() {
  const token = getAccessToken();
  const role = getRoleFromToken(token);

  if (!token || !role) {
    return <LoginPage />;
  }

  if (role === 'root') {
    return <Navigate to="/admin/create-admin" replace />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/" replace />;
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
  const shouldHideNavBar = location.pathname === '/login' || location.pathname === '/register' || location.pathname.startsWith('/admin') || location.pathname === '/forgot-password' || location.pathname.startsWith('/reset-password');
  const navBarVariant = getNavBarVariant();

  return (
    <div className="bg-bg w-screen min-h-screen flex flex-col transition-all duration-300 ease-in-out">
      {!shouldHideNavBar && <NavBar variant={navBarVariant} />}
      <header className={`relative z-60 pointer-events-none w-full flex justify-end p-4 ${shouldHideNavBar && location.pathname.startsWith('/admin') ? 'hidden' : ''}`}>
        <div className="pointer-events-auto">
          <Toggle />
        </div>
      </header>
      <main className={`flex-1 ${location.pathname.startsWith('/admin') ? '' : 'flex items-center justify-center'}`}>
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<PublicLoginRoute />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/catalog" element={<CatalogPage />} />

          {/* Privadas */}
          <Route path="/" element={<ProtectedClientRoute />} />
          <Route path="/admin" element={<ProtectedAdminRoute />} />
          <Route path="/admin/books" element={<ProtectedAdminOnlyRoute element={<BooksManagementPage />} />} />
          <Route path="/admin/stores" element={<ProtectedAdminOnlyRoute element={<StoresManagementPage />} />} />
          <Route path="/admin/admins" element={<ProtectedRootOnlyRoute element={<AdminsManagementPage />} />} />
          <Route path="/admin/create-admin" element={<ProtectedRootOnlyRoute element={<RootAdminCreationPage />} />} />

          {/* Otros */}
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  useTheme();
  return (
    <BrowserRouter>
      <SnackbarProvider
        config={{
          position: 'bottom-center',
          maxVisible: 3,
          maxQueue: 20,
          dedupeWindowMs: 1500,
        }}
      >
        <AppContent />
      </SnackbarProvider>
    </BrowserRouter>
  );
}

export default App;
