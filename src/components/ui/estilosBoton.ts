/**
 * Clases de los botones. Las comparten <Button> y los enlaces que se ven como
 * botones: un enlace que lleva a otra página debe ser un <a>, no un <button>
 * dentro de un <a>, porque anidar elementos interactivos no es HTML válido y
 * confunde a los lectores de pantalla.
 *
 * Píldoras como en el tablero de marca: la principal con el degradado de la
 * marca (`boton-primario`), la de acento con borde cian (`boton-contorno`) y la
 * secundaria de vidrio con borde de control (≥ 3:1).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'boton-primario text-white',
  secondary:
    'bg-surface-card/70 text-text-primary border border-line-input backdrop-blur-md hover:bg-surface-hover hover:border-accent/70',
  ghost:
    'bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary',
  danger:
    'bg-error-strong text-white shadow-[0_10px_28px_-12px_rgb(220_38_38/0.8)] hover:bg-error-strong/90',
  accent:
    'boton-contorno text-text-primary',
};

// Altura mínima de 44 px en todos los tamaños (área táctil, WCAG 2.5.8).
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4 py-2 text-sm rounded-full',
  md: 'min-h-12 px-6 py-3 text-base rounded-full',
  lg: 'min-h-14 px-8 py-4 text-lg rounded-full',
};

export function estilosBoton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
}: {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly fullWidth?: boolean;
  readonly className?: string;
} = {}): string {
  return `
    inline-flex items-center justify-center gap-2
    font-semibold leading-tight tracking-[-0.01em] presionable
    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
    cursor-pointer select-none
    ${VARIANT_CLASSES[variant]}
    ${SIZE_CLASSES[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `;
}
