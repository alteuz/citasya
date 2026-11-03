import { useState, useCallback } from 'react';
import { EnlaceBoton } from '@/components/ui/EnlaceBoton';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/marca/Logo';
import { useAuthContext } from '@/hooks/useAuthContext';

interface NavLink {
  readonly label: string;
  readonly href: string;
}

const NAV_LINKS: readonly NavLink[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Agendar cita', href: '/buscar' },
  { label: 'Cómo funciona', href: '/#como-funciona' },
  { label: 'Directorio EPS', href: '/directorio-eps' },
  { label: 'Ayuda', href: '/#ayuda' },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, profile, logout, isLoading } = useAuthContext();

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    closeMobileMenu();
    navigate('/');
  }, [logout, closeMobileMenu, navigate]);

  const firstName = profile?.fullName?.split(' ')[0] ?? '';

  return (
    <>
      <header className="sticky top-0 z-50 h-16 lg:h-[4.5rem] flex items-center bg-surface/70 backdrop-blur-xl backdrop-saturate-150">
      {/* Borde inferior de luz: la línea de la marca que se desvanece en los extremos. */}
      <div aria-hidden="true" className="linea-luz absolute inset-x-0 bottom-0 opacity-70" />
      <nav
        aria-label="Navegación principal"
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6"
      >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center shrink-0 rounded-xl"
            onClick={closeMobileMenu}
          >
            <Logo />
            <span className="sr-only">, ir al inicio</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                aria-current={location.pathname === link.href ? 'page' : undefined}
                className={`
                  inline-flex items-center min-h-10 px-4 rounded-full whitespace-nowrap
                  text-sm font-medium transicion
                  ${location.pathname === link.href
                    ? 'text-text-primary bg-white/[0.09] shadow-[inset_0_0_0_1px_rgb(126_160_255/0.28)]'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/[0.05]'}
                `}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Actions */}
          <div className="hidden lg:flex items-center gap-2">
            {isLoading ? (
              <div className="h-11 w-28 bg-surface-strong rounded-full animate-skeleton" />
            ) : isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center min-h-11 pl-1 pr-3 rounded-full text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-white/[0.05] transicion"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="boton-primario w-9 h-9 rounded-full text-white text-sm font-bold flex items-center justify-center">
                      {firstName.charAt(0).toUpperCase()}
                    </span>
                    {firstName}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-medium"
                  onClick={() => { void handleLogout(); }}
                >
                  Salir
                </Button>
              </>
            ) : (
              <>
                <EnlaceBoton to="/iniciar-sesion" variant="accent" size="sm" className="px-5">
                  Iniciar sesión
                </EnlaceBoton>
                <EnlaceBoton to="/registrarse" variant="primary" size="sm" className="px-5">
                  Registrarse
                </EnlaceBoton>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={toggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="lg:hidden inline-flex items-center justify-center min-h-11 min-w-11 rounded-full border border-white/10 bg-white/[0.05] text-text-secondary hover:text-text-primary hover:bg-white/[0.1] presionable cursor-pointer"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
      </nav>
    </header>

    {/* Mobile Menu */}
    {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 top-16 bg-surface/70 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
          <div
            id="mobile-menu"
            role="navigation"
            aria-label="Menú móvil"
            className="fixed right-0 top-16 bottom-0 w-[min(20rem,100vw)] bg-surface-muted/95 backdrop-blur-xl border-l border-white/10 shadow-elevated z-50 lg:hidden animate-slide-in overflow-y-auto"
          >
              <div className="flex flex-col p-6 gap-2">
                {/* Auth user header for mobile */}
                {isAuthenticated && profile && (
                  <div className="tarjeta flex items-center gap-3 px-4 py-3 mb-2 rounded-2xl">
                    <span className="boton-primario w-10 h-10 shrink-0 rounded-full text-white text-sm font-bold flex items-center justify-center">
                      {firstName.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{firstName}</p>
                      <p className="text-xs text-text-secondary break-all">{profile.email}</p>
                    </div>
                  </div>
                )}

                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={closeMobileMenu}
                    className={`
                      flex items-center min-h-12 px-4 py-3 rounded-2xl text-base font-medium transicion
                      ${location.pathname === link.href
                        ? 'bg-white/[0.08] text-text-primary font-semibold shadow-[inset_0_0_0_1px_rgb(126_160_255/0.25)]'
                        : 'text-text-secondary hover:bg-white/[0.05] hover:text-text-primary'
                      }
                    `}
                  >
                    {link.label}
                  </Link>
                ))}

                {isAuthenticated && (
                  <Link
                    to="/dashboard"
                    onClick={closeMobileMenu}
                    className={`
                      flex items-center min-h-12 px-4 py-3 rounded-2xl text-base font-medium transicion
                      ${location.pathname === '/dashboard'
                        ? 'bg-white/[0.08] text-text-primary font-semibold shadow-[inset_0_0_0_1px_rgb(126_160_255/0.25)]'
                        : 'text-text-secondary hover:bg-white/[0.05] hover:text-text-primary'
                      }
                    `}
                  >
                    Mi panel
                  </Link>
                )}

                <div aria-hidden="true" className="linea-luz my-3" />

                {isAuthenticated ? (
                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={() => { void handleLogout(); }}
                  >
                    Cerrar sesión
                  </Button>
                ) : (
                  <>
                    <EnlaceBoton to="/iniciar-sesion" onClick={closeMobileMenu} variant="accent" size="md" fullWidth>
                      Iniciar sesión
                    </EnlaceBoton>
                    <EnlaceBoton to="/registrarse" onClick={closeMobileMenu} variant="primary" size="md" fullWidth className="mt-2">
                      Registrarse
                    </EnlaceBoton>
                  </>
                )}
              </div>
            </div>
          </>
        )}
    </>
  );
}
