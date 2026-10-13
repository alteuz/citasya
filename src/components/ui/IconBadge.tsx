import type { LucideIcon } from 'lucide-react';

type IconBadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'error';
type IconBadgeSize = 'sm' | 'md' | 'lg';

interface IconBadgeProps {
  readonly icon: LucideIcon;
  readonly tone?: IconBadgeTone;
  readonly size?: IconBadgeSize;
  readonly className?: string;
}

const TONE_CLASSES: Record<IconBadgeTone, string> = {
  neutral: 'bg-surface-hover text-text-secondary border-line-strong',
  brand: 'bg-brand-soft text-link border-brand/40',
  success: 'bg-success-soft text-success border-success/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
  error: 'bg-error-soft text-error border-error/30',
};

const SIZE_CLASSES: Record<IconBadgeSize, { box: string; icon: number }> = {
  sm: { box: 'h-10 w-10 rounded-xl', icon: 20 },
  md: { box: 'h-14 w-14 rounded-2xl', icon: 26 },
  lg: { box: 'h-16 w-16 rounded-2xl', icon: 30 },
};

/** Ícono decorativo dentro de una pastilla con borde: reemplaza a los emojis. */
export function IconBadge({ icon: Icon, tone = 'neutral', size = 'md', className = '' }: IconBadgeProps) {
  const { box, icon } = SIZE_CLASSES[size];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center border ${box} ${TONE_CLASSES[tone]} ${className}`}
    >
      <Icon size={icon} strokeWidth={1.75} />
    </span>
  );
}
