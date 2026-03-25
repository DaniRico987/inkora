import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toggle } from './Components/Toggle';
import { useTheme } from './theme/useTheme';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SnackbarProvider } from './Components/SnackbarProvider';
import { getAccessToken, getRoleFromToken } from './auth/session';
import { AdminPage } from './pages/AdminPage';
import { ClientHomePage } from './pages/ClientHomePage';

function ProtectedClientRoute() {
  const token = getAccessToken();
  const role = getRoleFromToken(token);

  if (!token || !role) {
    return <Navigate to="/login" replace />;
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

  return <AdminPage />;
}

function PublicLoginRoute() {
  const token = getAccessToken();
  const role = getRoleFromToken(token);

  if (!token || !role) {
    return <LoginPage />;
  }

  if (role === 'admin' || role === 'root') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/" replace />;
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
        <div className="bg-bg w-screen min-h-screen flex flex-col transition-all duration-300 ease-in-out">
          <header className="w-full flex justify-end p-4">
            <Toggle />
          </header>
          <main className="flex-1 flex items-center justify-center">
            <Routes>
              <Route path="/" element={<ProtectedClientRoute />} />
              <Route path="/admin" element={<ProtectedAdminRoute />} />
              <Route path="/login" element={<PublicLoginRoute />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route
                path="/reset-password/:token"
                element={<ResetPasswordPage />}
              />
            </Routes>
          </main>
        </div>
      </SnackbarProvider>
    </BrowserRouter>
  );
}

export default App;
