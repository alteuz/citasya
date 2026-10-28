import { Link, type LinkProps } from 'react-router';
import { estilosBoton, type ButtonSize, type ButtonVariant } from './estilosBoton';

interface EnlaceBotonProps extends LinkProps {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly fullWidth?: boolean;
  /** Otra acción está en curso (p. ej., se está cancelando la cita): se ve atenuado y no navega. */
  readonly deshabilitado?: boolean;
  readonly className?: string;
}

/**
 * Enlace con apariencia de botón. Lleva a otra página, así que es un <a>: un
 * <button> dentro de un <a> anida dos controles interactivos, no es HTML válido
 * y el lector de pantalla los anuncia dos veces (H-44).
 */
export function EnlaceBoton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  deshabilitado = false,
  className = '',
  children,
  ...enlace
}: EnlaceBotonProps) {
  const clases = estilosBoton({ variant, size, fullWidth, className });
  if (deshabilitado) {
    return (
      <span aria-disabled="true" className={`${clases} opacity-50 cursor-not-allowed shadow-none`}>
        {children}
      </span>
    );
  }
  return (
    <Link {...enlace} className={clases}>
      {children}
    </Link>
  );
}
