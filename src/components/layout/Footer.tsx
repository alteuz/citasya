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
      className="bg-primary-950 text-primary-200"
      aria-label="Pie de página"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="" className="h-14 w-14 object-contain shrink-0" />
              <span className="font-serif text-[28px] tracking-tight font-normal text-white">
                Citas<span className="text-accent-400">YA</span>
              </span>
              <span className="sr-only">, ir al inicio</span>
            </Link>
            <p className="text-sm text-primary-300 leading-relaxed max-w-xs">
              {APP_TAGLINE}
            </p>
          </div>

          {/* Sections */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                {section.title}
              </h2>
              {/* role="list" es intencional: Safari/VoiceOver elimina la semántica de lista cuando list-style es none (reset de Tailwind). */}
              {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
              <ul className="flex flex-col gap-2.5" role="list">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="text-sm text-primary-300 hover:text-accent-400 transition-colors duration-200"
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
        <div className="mt-12 pt-8 border-t border-primary-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-primary-400">
            © {currentYear} {APP_NAME} — Bogotá, Colombia. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-primary-400">
              Hecho con 💜 para la salud de los colombianos
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
