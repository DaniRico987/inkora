import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toggle } from './Components/Toggle';
import { useTheme } from './theme/useTheme';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SnackbarProvider } from './Components/SnackbarProvider';

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
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route
                path="/reset-password/:token"
                element={<ResetPasswordPage />}
              />
              {/* TODO: agregar aquí /login y demás rutas cuando estén listas */}
            </Routes>
          </main>
        </div>
      </SnackbarProvider>
    </BrowserRouter>
  );
}

export default App;
