import { Link } from 'react-router';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

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
      className="bg-surface-muted/80 text-text-secondary border-t border-line"
      aria-label="Pie de página"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-3 self-start rounded-xl">
              <img src="/logo.png" alt="" className="h-10 w-10 object-contain shrink-0" />
              <span className="font-serif text-2xl tracking-tight text-text-primary">
                Citas<span className="text-accent">YA</span>
              </span>
              <span className="sr-only">, ir al inicio</span>
            </Link>
            <p className="text-sm text-text-secondary leading-relaxed max-w-xs">
              {APP_TAGLINE}
            </p>
          </div>

          {/* Sections */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-4">
              <h2 className="font-sans text-sm font-semibold text-text-primary">
                {section.title}
              </h2>
              {/* role="list" es intencional: Safari/VoiceOver elimina la semántica de lista cuando list-style es none (reset de Tailwind). */}
              {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
              <ul className="flex flex-col gap-1" role="list">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="inline-flex items-center min-h-11 text-sm text-text-muted hover:text-text-primary transition-colors duration-150"
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
        <div className="mt-12 pt-8 border-t border-line flex flex-col sm:flex-row justify-between items-center gap-4">
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
