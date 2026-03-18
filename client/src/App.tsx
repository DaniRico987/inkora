
import './App.css'
import { Button } from './Components/Button'
import { InputText,InputPassword,InputSelect,InputTextarea,Checkbox,InputSearch } from './Components/Inputs';
import { Toggle } from './Components/Toggle'
import { useTheme } from "./theme/useTheme";

function App() {
  useTheme();
  return (
    <div className="bg-bg w-screen flex flex-col items-center justify-center gap-3.5 transition-all duration-300 ease-in-out">
      {<Toggle />
      }
      <Button variant='primary' size="20rem" onClick={() => console.log('Primary button clicked!')}>
        Click me
      </Button>
      <Button variant="secondary" size="20rem" onClick={() => console.log('Button clicked!')}>
        Click me
      </Button>
      <Button variant="destructive" size="20rem" onClick={() => console.log('Destructive button clicked!')}>
        Delete
      </Button>

      <div className="max-w-sm p-6 flex flex-col">
        <InputText
          label="Nombre completo"
          value="Juan Pérez"
        />

        <InputText
          label="Correo electrónico"
          type="email"
          placeholder="ejemplo@correo.com"
        />

        <InputPassword
          label="Contraseña"
          placeholder="Ingresa tu contraseña"
        />

        <InputTextarea
          label="Descripción"
          placeholder="Escribe aquí..."
        />

        <InputSelect
          label="País"
          options={[
            { label: "Colombia", value: "co" },
            { label: "México", value: "mx" },
            { label: "Argentina", value: "ar" },
          ]}
        />

        <Checkbox label="Acepto los términos y condiciones" />

        <InputSearch placeholder="Buscar..." />
      </div>

    </div>
  )
}

export default App
