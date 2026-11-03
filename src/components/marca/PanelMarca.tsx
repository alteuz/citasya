import { IconBadge } from '@/components/ui/IconBadge';
import { VALORES_MARCA } from '@/lib/marca';

/**
 * Panel de marca de las pantallas de acceso (escritorio): titular, la ilustración
 * del calendario 3D del tablero de marca y sus tres valores. En el DOM va después
 * del formulario (el lector de pantalla llega primero a lo que la persona vino a
 * hacer) y se muestra a la izquierda con `order`. En el celular no se muestra ni
 * se descarga su imagen (loading="lazy" dentro de un contenedor oculto).
 */
export function PanelMarca() {
  return (
    <div className="vidrio relative hidden lg:flex lg:order-first flex-col justify-between overflow-hidden rounded-[2rem] p-10 xl:p-12">
      <div aria-hidden="true" className="decorativo pointer-events-none absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(closest-side,rgb(88_67_252/0.35),transparent)]" />
      <div aria-hidden="true" className="decorativo pointer-events-none absolute -bottom-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(closest-side,rgb(0_233_252/0.16),transparent)]" />

      <div className="relative">
        <p className="rotulo text-xs text-accent">Disponible 24/7 · Bogotá</p>
        <p className="mt-4 font-display text-4xl xl:text-5xl font-extrabold leading-[1.05] tracking-[-0.035em] text-text-primary">
          Tu salud, <span className="texto-degradado">a un clic.</span>
        </p>
        <p className="mt-4 max-w-sm text-lg leading-relaxed text-text-secondary">
          Agenda, reprograma y consulta tus citas con tu EPS desde cualquier lugar.
        </p>
      </div>

      {/* Ilustración del tablero de marca. Su fondo azul oscuro desaparece con
          `lighten` sobre el vidrio, y la máscara funde los bordes. */}
      <img
        src="/imagenes/calendario-3d-1040.webp"
        srcSet="/imagenes/calendario-3d-560.webp 560w, /imagenes/calendario-3d-1040.webp 1040w"
        sizes="28rem"
        width={1040}
        height={750}
        loading="lazy"
        decoding="async"
        alt=""
        className="relative my-6 w-full max-w-md self-center mix-blend-lighten [mask-image:radial-gradient(closest-side,#000_72%,transparent)]"
      />

      <ul className="relative space-y-4">
        {VALORES_MARCA.map((valor) => (
          <li key={valor.titulo} className="flex items-center gap-4">
            <IconBadge icon={valor.icono} tone="brand" size="sm" />
            <span>
              <span className="block font-semibold text-text-primary">{valor.titulo}</span>
              <span className="block text-sm text-text-muted">{valor.texto}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
