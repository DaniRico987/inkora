import { useTheme } from "../theme/useTheme";

export function Toggle() {
  const { toggle, theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className={`
        relative inline-flex items-center justify-between
        w-16 h-8 rounded-full
        border border-border
        bg-bg-card
        px-1
        transition-colors duration-300
        ${isDark ? "bg-primary-500/10" : "bg-babyblue-500/10"}
      `}
    >
      {/* Icono sol */}
      <span
        className={`
          z-10 flex items-center justify-center w-6 h-6 rounded-full
          text-amber-400 text-xs
          transition-opacity duration-300
          ${isDark ? "opacity-40" : "opacity-100"}
        `}
      >
        ☀️
      </span>

      {/* Icono luna */}
      <span
        className={`
          z-10 flex items-center justify-center w-6 h-6 rounded-full
          text-sky-300 text-xs
          transition-opacity duration-300
          ${isDark ? "opacity-100" : "opacity-40"}
        `}
      >
        🌙
      </span>

      {/* “thumb” deslizante */}
      <span
        className={`
          absolute top-1 left-1
          w-6 h-6 rounded-full
          bg-bg shadow-md
          transform transition-transform duration-300
          ${isDark ? "translate-x-8" : "translate-x-0"}
        `}
      />
    </button>
  );
}