
import './App.css'
import { Button } from './Components/Button'
//import { Toggle } from './Components/Toggle'
import { useTheme } from "./theme/useTheme";

function App() {
  useTheme();
  return (
    <div className="bg-white">
      {/*<Toggle />*/}
      <Button variant="primary" size='lg' onClick={() => console.log('Button clicked!')}>
        Click me
      </Button>
    </div>
  )
}

export default App
