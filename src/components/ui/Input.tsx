import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string;
  readonly error?: string;
  readonly helperText?: string;
  readonly leftIcon?: ReactNode;
  readonly rightIcon?: ReactNode;
  readonly inputId?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, leftIcon, rightIcon, inputId, className = '', ...rest },
  ref,
) {
  const id = inputId ?? rest.id ?? rest.name;
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`
            w-full rounded-xl border bg-surface-card px-4 py-3
            text-base text-text-primary placeholder:text-text-muted
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400
            disabled:opacity-50 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-error ring-1 ring-error/20' : 'border-primary-200 hover:border-primary-300'}
            ${className}
          `}
          {...rest}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-error font-medium" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-sm text-text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});
