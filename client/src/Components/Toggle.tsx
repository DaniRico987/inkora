import { useTheme } from '../theme/useTheme';

export function Toggle() {
  const { toggle, theme } = useTheme();

  return (
    <div className="bg-bg text-text border border-border">
      <button onClick={toggle}>
        Cambiar a {theme === 'light' ? 'oscuro' : 'claro'}
      </button>
    </div>
  );
}