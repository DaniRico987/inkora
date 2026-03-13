import { useTheme } from '../theme/useTheme';

export function Card() {
  const { toggle, theme } = useTheme();

  return (
    <div className="bg-bg text-text border border-border">
      <p className="text-primary">Hola mundo</p>
      <p className="text-text-muted">Subtítulo</p>

      <button onClick={toggle}>
        Cambiar a {theme === 'light' ? 'oscuro' : 'claro'}
      </button>
    </div>
  );
}