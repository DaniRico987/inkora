import type { ViewToggleProps } from '../interfaces/ViewToggleInterface';

export default function ViewToggle({ isGrid, onToggle }: ViewToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-label={isGrid ? "Cambiar a lista" : "Cambiar a grid"}
      className="group relative flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-bg text-text text-sm font-medium tracking-wide shadow-sm hover:shadow-md hover:border-border-focus transition-all duration-200"
    >
      {/* Grid icon */}
      <span
        className={`transition-all duration-300 ${
          isGrid ? "opacity-100 scale-100" : "opacity-40 scale-90"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
          <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
          <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
          <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
        </svg>
      </span>

      {/* Pill deslizante */}
      <span className="relative w-10 h-5 rounded-full bg-surface flex items-center px-0.5">
        <span
          className={`absolute w-4 h-4 rounded-full bg-bg shadow transition-all duration-300 ${
            isGrid ? "left-0.5" : "left-5.5"
          }`}
        />
      </span>

      {/* List icon */}
      <span
        className={`transition-all duration-300 ${
          isGrid ? "opacity-40 scale-90" : "opacity-100 scale-100"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="2" width="14" height="2.5" rx="1.25" fill="currentColor" />
          <rect x="1" y="6.75" width="14" height="2.5" rx="1.25" fill="currentColor" />
          <rect x="1" y="11.5" width="14" height="2.5" rx="1.25" fill="currentColor" />
        </svg>
      </span>
    </button>
  );
}
