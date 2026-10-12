import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';

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
          <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`
            w-full min-h-12 rounded-xl border bg-surface-card px-4 py-3
            text-base text-text-primary placeholder:text-text-muted
            focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
            disabled:opacity-60 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-error ring-1 ring-error/30' : 'border-line-input hover:border-text-muted'}
            ${className}
          `}
          {...rest}
        />
        {rightIcon && (
          <span aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-error font-medium" role="alert">
          <CircleAlert size={14} aria-hidden="true" className="shrink-0" />
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
