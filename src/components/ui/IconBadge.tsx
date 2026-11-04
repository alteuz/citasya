import type { LucideIcon } from 'lucide-react';

type IconBadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'error';
type IconBadgeSize = 'sm' | 'md' | 'lg';

interface IconBadgeProps {
  readonly icon: LucideIcon;
  readonly tone?: IconBadgeTone;
  readonly size?: IconBadgeSize;
  readonly className?: string;
}

// La pastilla de marca es la «placa de ícono» del tablero: fondo azul marino,
// borde de luz en degradado y el trazo del ícono en el degradado de la marca.
const TONE_CLASSES: Record<IconBadgeTone, string> = {
  neutral: 'bg-surface-hover text-text-secondary border border-line-strong',
  brand: 'borde-luz icono-degradado bg-[linear-gradient(160deg,#0f2463,#071232)] text-link shadow-[inset_0_0_14px_rgb(29_105_252/0.25),0_8px_24px_-12px_rgb(29_105_252/0.7)]',
  success: 'bg-success-soft text-success border border-success/30',
  warning: 'bg-warning-soft text-warning border border-warning/30',
  error: 'bg-error-soft text-error border border-error/30',
};

const SIZE_CLASSES: Record<IconBadgeSize, { box: string; icon: number }> = {
  sm: { box: 'h-11 w-11 rounded-xl', icon: 20 },
  md: { box: 'h-14 w-14 rounded-2xl', icon: 26 },
  lg: { box: 'h-16 w-16 rounded-[1.375rem]', icon: 30 },
};

/** Ícono decorativo dentro de una pastilla con borde: reemplaza a los emojis. */
export function IconBadge({ icon: Icon, tone = 'neutral', size = 'md', className = '' }: IconBadgeProps) {
  const { box, icon } = SIZE_CLASSES[size];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${box} ${TONE_CLASSES[tone]} ${className}`}
    >
      <Icon size={icon} strokeWidth={1.75} />
    </span>
  );
}
