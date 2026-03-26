import type {
  SpinnerProps,
  SpinnerSize,
  SpinnerTone,
} from '../interfaces/SpinnerInterface';

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'w-7 h-7 sm:w-8 sm:h-8',
  md: 'w-10 h-10 sm:w-12 sm:h-12',
  lg: 'w-14 h-14 sm:w-16 sm:h-16',
};

const ringClasses: Record<SpinnerTone, string> = {
  brand: 'border-primary-500/80 border-t-skyblue-400 border-r-babyblue-500',
  calm: 'border-metallicgold-400/70 border-t-skyblue-500 border-r-primary-400',
  danger: 'border-red-400/75 border-t-red-600 border-r-rose-400',
};

const glowClasses: Record<SpinnerTone, string> = {
  brand: 'bg-primary-500/18',
  calm: 'bg-skyblue-500/18',
  danger: 'bg-red-500/18',
};

const dotClasses: Record<SpinnerTone, string> = {
  brand: 'bg-skyblue-400',
  calm: 'bg-primary-400',
  danger: 'bg-red-500',
};

export function Spinner({
  size = 'md',
  tone = 'brand',
  label = 'Cargando...',
  className = '',
  fullScreen = false,
}: SpinnerProps) {
  const content = (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex max-w-full flex-col items-center justify-center gap-2.5 sm:gap-3 ${className}`}
    >
      <span
        className={[
          'relative inline-flex items-center justify-center',
          sizeClasses[size],
        ].join(' ')}
      >
        <span
          className={[
            'absolute inset-0 rounded-full blur-md animate-pulse',
            glowClasses[tone],
          ].join(' ')}
          aria-hidden="true"
        />
        <span
          className={[
            'absolute inset-0 rounded-full border-[3px] animate-spin',
            ringClasses[tone],
          ].join(' ')}
          aria-hidden="true"
        />
        <span
          className={[
            'absolute h-2.5 w-2.5 rounded-full animate-bounce',
            dotClasses[tone],
          ].join(' ')}
          aria-hidden="true"
        />
      </span>
      {label ? <span className="text-xs sm:text-sm text-text-muted text-center wrap-break-word">{label}</span> : null}
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/55 backdrop-blur-sm px-3 sm:px-4">
      <div
        className="absolute top-0 left-0 h-40 w-40 rounded-full bg-skyblue-500/20 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-primary-500/20 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-xs rounded-3xl border border-border bg-bg-secondary/95 px-5 py-5 shadow-2xl sm:max-w-sm sm:px-8 sm:py-7">
        {content}
      </div>
    </div>
  );
}
