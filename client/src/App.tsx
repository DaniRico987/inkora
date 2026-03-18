
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toggle } from "./Components/Toggle";
import { useTheme } from "./theme/useTheme";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

function App() {
  useTheme();
  return (
    <BrowserRouter>
      <div className="bg-bg min-h-screen flex flex-col items-center transition-all duration-300 ease-in-out">
        <div className="w-full flex justify-end p-4">
          <Toggle />
        </div>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          {/* TODO: agregar aquí /login y demás rutas cuando estén listas */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
