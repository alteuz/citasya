import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly isLoading?: boolean;
  readonly leftIcon?: ReactNode;
  readonly rightIcon?: ReactNode;
  readonly fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white shadow-button hover:bg-brand-hover',
  secondary:
    'bg-surface-card text-text-primary border border-line-input hover:bg-surface-hover hover:border-text-muted',
  ghost:
    'bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary',
  danger:
    'bg-error-strong text-white hover:bg-error-strong/90',
  accent:
    'bg-accent text-text-inverse shadow-button hover:bg-accent-hover',
};

// Altura mínima de 44 px en todos los tamaños (área táctil, WCAG 2.5.8).
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4 py-2 text-sm rounded-lg',
  md: 'min-h-12 px-6 py-3 text-base rounded-xl',
  lg: 'min-h-14 px-8 py-4 text-lg rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold leading-tight presionable
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        cursor-pointer select-none
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...rest}
    >
      {isLoading ? (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          role="status"
          aria-label="Cargando"
        />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
