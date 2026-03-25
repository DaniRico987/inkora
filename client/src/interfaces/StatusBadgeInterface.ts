export type BadgeTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

export type BadgeSize = 'sm' | 'md';

export interface StatusBadgeProps {
  label: string;
  tone?: BadgeTone;
  size?: BadgeSize;
  withDot?: boolean;
  className?: string;
}
