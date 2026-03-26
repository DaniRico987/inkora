import type {
  BadgeSize,
  BadgeTone,
  StatusBadgeProps,
} from '../interfaces/StatusBadgeInterface';

const toneClasses: Record<BadgeTone, string> = {
  neutral:
    'bg-metallicgold-100/80 text-metallicgold-800 border-metallicgold-300/70',
  info: 'bg-skyblue-100/80 text-skyblue-800 border-skyblue-300/70',
  success: 'bg-emerald-100/80 text-emerald-700 border-emerald-300/80',
  warning: 'bg-amber-100/80 text-amber-700 border-amber-300/80',
  danger: 'bg-red-100/80 text-red-700 border-red-300/80',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[0.68rem] px-2 py-1',
  md: 'text-[0.7rem] sm:text-xs px-2.5 py-1.5',
};

const dotToneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-metallicgold-600',
  info: 'bg-skyblue-600',
  success: 'bg-emerald-600',
  warning: 'bg-amber-600',
  danger: 'bg-red-600',
};

export function StatusBadge({
  label,
  tone = 'neutral',
  size = 'md',
  withDot = true,
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex max-w-full items-center gap-1.5 rounded-full border font-semibold tracking-[0.02em]',
        'uppercase whitespace-nowrap select-none',
        toneClasses[tone],
        sizeClasses[size],
        className,
      ].join(' ')}
      title={label}
    >
      {withDot && (
        <span
          className={[
            'inline-block h-1.5 w-1.5 rounded-full',
            dotToneClasses[tone],
          ].join(' ')}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}
