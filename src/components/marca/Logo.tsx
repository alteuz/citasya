/**
 * Logotipo de CitasYA: el símbolo (calendario + estetoscopio) dentro de su placa
 * de vidrio con borde luminoso, y el nombre con «YA» en el degradado de la marca.
 * Es decorativo: el enlace que lo contiene pone el nombre accesible.
 */
type TamanoLogo = 'sm' | 'md' | 'lg';

interface LogoProps {
  /** sm: barra de navegación · md: pie de página y menú móvil · lg: pantallas de acceso. */
  readonly tamano?: TamanoLogo;
  /** Muestra el nombre junto al símbolo. */
  readonly conNombre?: boolean;
  readonly className?: string;
}

const PLACA: Record<TamanoLogo, { caja: string; alto: number; nombre: string }> = {
  sm: { caja: 'h-10 w-10 rounded-xl', alto: 24, nombre: 'text-logo' },
  md: { caja: 'h-12 w-12 rounded-2xl', alto: 30, nombre: 'text-[1.75rem] leading-none' },
  lg: { caja: 'h-16 w-16 rounded-[1.375rem]', alto: 40, nombre: 'text-logo-lg' },
};

export function Logo({ tamano = 'sm', conNombre = true, className = '' }: LogoProps) {
  const { caja, alto, nombre } = PLACA[tamano];
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span className={`placa-logo grid place-items-center shrink-0 ${caja}`} aria-hidden="true">
        {/* 120 × 128 px: el ancho se calcula con la proporción para no mover el diseño al cargar. */}
        <img
          src="/marca/logo-marca-128.webp"
          alt=""
          width={Math.round((alto * 120) / 128)}
          height={alto}
          decoding="async"
          className="drop-shadow-[0_0_8px_rgb(0_233_252/0.45)]"
        />
      </span>
      {conNombre && (
        <span className={`font-display font-extrabold tracking-[-0.03em] text-text-primary ${nombre}`}>
          Citas<span className="texto-degradado">YA</span>
        </span>
      )}
    </span>
  );
}
