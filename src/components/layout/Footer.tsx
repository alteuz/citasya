import { Link } from 'react-router';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import { Logo } from '@/components/marca/Logo';
import { Ondas } from '@/components/marca/Ondas';

interface FooterSection {
  readonly title: string;
  readonly links: readonly { label: string; href: string }[];
}

const FOOTER_SECTIONS: readonly FooterSection[] = [
  {
    title: 'Servicios',
    links: [
      { label: 'Agendar cita', href: '/buscar' },
      { label: 'Mis citas', href: '/dashboard' },
      { label: 'Directorio EPS', href: '/directorio-eps' },
      { label: 'Telemedicina', href: '/buscar?modo=telemedicina' },
    ],
  },
  {
    title: 'Soporte',
    links: [
      { label: 'Cómo funciona', href: '/#como-funciona' },
    ],
  },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="relative overflow-hidden bg-surface-muted/70 text-text-secondary border-t border-white/[0.06]"
      aria-label="Pie de página"
    >
      {/* Ondas de luz y halo de la marca: decorativos */}
      <Ondas className="absolute inset-x-0 top-0 h-20 md:h-28 opacity-70" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 left-1/2 h-96 w-[56rem] max-w-[140%] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-10 md:pt-32 md:pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] gap-10">
          {/* Brand */}
          <div className="flex flex-col gap-5">
            <Link to="/" className="flex items-center self-start rounded-xl">
              <Logo tamano="md" />
              <span className="sr-only">, ir al inicio</span>
            </Link>
            <p className="text-base text-text-secondary leading-relaxed max-w-xs">
              {APP_TAGLINE}
            </p>
          </div>

          {/* Sections */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-4">
              <h2 className="rotulo text-text-muted">
                {section.title}
              </h2>
              {/* role="list" es intencional: Safari/VoiceOver elimina la semántica de lista cuando list-style es none (reset de Tailwind). */}
              {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
              <ul className="flex flex-col gap-1" role="list">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="inline-flex items-center min-h-11 text-sm text-text-secondary hover:text-accent transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div aria-hidden="true" className="linea-luz mt-12 opacity-60" />
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-text-secondary">
            © {currentYear} {APP_NAME} — Bogotá, Colombia. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-text-secondary">
              Hecho en Bogotá para la salud de los colombianos
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
