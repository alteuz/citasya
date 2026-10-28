import { useState, useCallback } from 'react';
import { EnlaceBoton } from '@/components/ui/EnlaceBoton';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
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
      <header className="sticky top-0 z-50 h-16 flex items-center bg-surface/75 backdrop-blur-xl backdrop-saturate-150 border-b border-line/70">
      <nav
        aria-label="Navegación principal"
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6"
      >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 shrink-0 rounded-xl"
            onClick={closeMobileMenu}
          >
            <img
              src="/logo.png"
              alt=""
              className="h-10 w-10 object-contain shrink-0"
            />
            <span className="font-serif text-2xl tracking-tight text-text-primary">
              Citas<span className="text-accent">YA</span>
            </span>
            <span className="sr-only">, ir al inicio</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                aria-current={location.pathname === link.href ? 'page' : undefined}
                className={`
                  inline-flex items-center min-h-11 px-3.5 rounded-full whitespace-nowrap
                  text-sm font-medium transition-colors duration-150
                  ${location.pathname === link.href
                    ? 'text-text-primary bg-surface-hover'
                    : 'text-text-muted hover:text-text-primary'}
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
                  className="inline-flex items-center min-h-11 px-2 rounded-full text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-150"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-brand text-white text-xs font-semibold flex items-center justify-center ring-1 ring-white/15">
                      {firstName.charAt(0).toUpperCase()}
                    </span>
                    {firstName}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full font-medium"
                  onClick={() => { void handleLogout(); }}
                >
                  Salir
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/iniciar-sesion"
                  className="inline-flex items-center min-h-11 px-3.5 rounded-full text-sm font-medium text-text-secondary hover:text-text-primary transition-colors duration-150"
                >
                  Iniciar sesión
                </Link>
                <EnlaceBoton to="/registrarse" variant="primary" size="sm" className="rounded-full px-5">
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
            className="lg:hidden inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-hover presionable cursor-pointer"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
              className="fixed inset-0 top-16 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
          <div
            id="mobile-menu"
            role="navigation"
            aria-label="Menú móvil"
            className="fixed right-0 top-16 bottom-0 w-[min(20rem,100vw)] bg-surface-muted border-l border-line shadow-elevated z-50 lg:hidden animate-slide-in overflow-y-auto"
          >
              <div className="flex flex-col p-6 gap-2">
                {/* Auth user header for mobile */}
                {isAuthenticated && profile && (
                  <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-surface-card rounded-xl border border-line">
                    <span className="w-9 h-9 shrink-0 rounded-full bg-brand text-white text-sm font-semibold flex items-center justify-center">
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
                      flex items-center min-h-12 px-4 py-3 rounded-xl text-base font-medium transition-colors duration-150
                      ${location.pathname === link.href
                        ? 'bg-surface-hover text-text-primary font-semibold'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
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
                      flex items-center min-h-12 px-4 py-3 rounded-xl text-base font-medium transition-colors duration-150
                      ${location.pathname === '/dashboard'
                        ? 'bg-surface-hover text-text-primary font-semibold'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                      }
                    `}
                  >
                    Mi panel
                  </Link>
                )}

                <hr className="my-3 border-line" />

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
                    <Link
                      to="/iniciar-sesion"
                      onClick={closeMobileMenu}
                      className={`
                        flex items-center min-h-12 px-4 py-3 rounded-xl text-base font-medium transition-colors duration-150
                        ${location.pathname === '/iniciar-sesion'
                          ? 'bg-surface-hover text-text-primary font-semibold'
                          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                        }
                      `}
                    >
                      Iniciar sesión
                    </Link>
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
