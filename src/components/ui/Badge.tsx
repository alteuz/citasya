import type { ReactNode } from 'react';

interface BadgeProps {
  readonly children: ReactNode;
  readonly variant?: 'default' | 'active' | 'accent';
  readonly clickable?: boolean;
  readonly isActive?: boolean;
  readonly onClick?: () => void;
  readonly className?: string;
}

const VARIANT_CLASSES = {
  default: 'bg-surface-hover text-text-secondary border border-line',
  active: 'bg-brand text-white border border-brand',
  accent: 'bg-accent-soft text-accent border border-accent/30',
} as const;

const CLICKABLE_HOVER = {
  default: 'hover:bg-surface-strong hover:text-text-primary',
  active: 'hover:bg-brand-hover',
  accent: 'hover:border-accent/60',
} as const;

export function Badge({
  children,
  variant = 'default',
  clickable = false,
  isActive = false,
  onClick,
  className = '',
}: BadgeProps) {
  const resolvedVariant = isActive ? 'active' : variant;
  const Tag = clickable ? 'button' : 'span';

  return (
    <Tag
      onClick={clickable ? onClick : undefined}
      className={`
        inline-flex items-center gap-1.5 px-4 py-2
        text-sm font-medium rounded-full
        ${VARIANT_CLASSES[resolvedVariant]}
        ${clickable ? `min-h-11 cursor-pointer presionable ${CLICKABLE_HOVER[resolvedVariant]}` : ''}
        ${className}
      `}
      {...(clickable ? { type: 'button' as const } : {})}
    >
      {children}
    </Tag>
  );
}
