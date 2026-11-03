import { useEffect, useRef, useState } from 'react';

interface FotoDiferidaProps {
  readonly src: string;
  readonly srcSet: string;
  readonly sizes: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly className?: string;
}

/**
 * Foto que se pide solo cuando su sección se acerca a la pantalla.
 *
 * `loading="lazy"` no basta en el celular: Chrome descarga las imágenes diferidas
 * que están a menos de ~1250 px del borde inferior, y la portada es corta, así que
 * las fotos se pedían durante la carga inicial y competían con el póster, que es
 * el elemento LCP. Aquí la imagen no existe hasta que el contenedor (que ya ocupa
 * su lugar con la misma proporción, sin mover el diseño) está a 200 px de verse.
 * Sin JavaScript queda el recuadro vacío: la foto es un complemento del texto.
 */
export function FotoDiferida({ src, srcSet, sizes, width, height, alt, className = '' }: FotoDiferidaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Sin IntersectionObserver (navegadores muy antiguos) la foto se muestra de una
    // vez. El estado inicial es el mismo en el prerenderizado y en el navegador
    // (oculta), así que el cambio va fuera del efecto para no forzar un segundo
    // render sincrónico.
    if (typeof IntersectionObserver === 'undefined') {
      const espera = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(espera);
    }
    const observador = new IntersectionObserver((entradas) => {
      if (entradas.some((entrada) => entrada.isIntersecting)) {
        setVisible(true);
        observador.disconnect();
      }
    }, { rootMargin: '200px 0px' });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <div ref={ref} className="bg-surface-card" style={{ aspectRatio: `${width} / ${height}` }}>
      {visible && (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          width={width}
          height={height}
          decoding="async"
          alt={alt}
          className={`block h-full w-full object-cover animate-fade-in ${className}`}
        />
      )}
    </div>
  );
}
