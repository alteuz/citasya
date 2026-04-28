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
  default: 'bg-primary-100 text-primary-700 hover:bg-primary-200',
  active: 'bg-primary-800 text-white',
  accent: 'bg-accent-100 text-accent-600 hover:bg-accent-200',
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
        transition-all duration-200 ease-out
        ${VARIANT_CLASSES[resolvedVariant]}
        ${clickable ? 'cursor-pointer active:scale-95' : ''}
        ${className}
      `}
      {...(clickable ? { type: 'button' as const } : {})}
    >
      {children}
    </Tag>
  );
}
