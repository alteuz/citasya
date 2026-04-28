interface SkeletonProps {
  readonly width?: string;
  readonly height?: string;
  readonly rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  readonly className?: string;
}

const ROUNDED_CLASSES = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
} as const;

export function Skeleton({
  width = '100%',
  height = '1rem',
  rounded = 'md',
  className = '',
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`bg-primary-100 animate-skeleton ${ROUNDED_CLASSES[rounded]} ${className}`}
      style={{ width, height }}
    />
  );
}
