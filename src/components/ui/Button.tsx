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
    'bg-primary-800 text-white hover:bg-primary-700 active:bg-primary-900 shadow-button',
  secondary:
    'bg-surface-card text-primary-800 border border-primary-200 hover:bg-primary-50 active:bg-primary-100',
  ghost:
    'bg-transparent text-primary-700 hover:bg-primary-50 active:bg-primary-100',
  danger:
    'bg-error text-white hover:bg-red-600 active:bg-red-700',
  accent:
    'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-600 shadow-button',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-6 py-3 text-base rounded-xl',
  lg: 'px-8 py-4 text-lg rounded-xl',
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
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold transition-all duration-200 ease-out
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400
        disabled:opacity-50 disabled:cursor-not-allowed
        cursor-pointer
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
