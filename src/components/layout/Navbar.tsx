import { useState, useCallback } from 'react';
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
      <header className="sticky top-0 z-50 bg-[#0d0d1a]/55 backdrop-blur-md border-b border-white/5 py-3">
      <nav
        aria-label="Navegación principal"
        className="w-full px-5 sm:px-8 md:px-8 flex items-center justify-between"
      >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 shrink-0"
            onClick={closeMobileMenu}
          >
            <img
              src="/logo.png"
              alt=""
              className="h-14 w-14 object-contain shrink-0"
            />
            <span className="font-serif text-[28px] tracking-tight font-normal text-white">
              Citas<span className="text-accent-400">YA</span>
            </span>
            <span className="sr-only">, ir al inicio</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`
                  text-[13px] font-semibold tracking-widest uppercase transition-colors duration-200
                  hover:text-accent-400
                  ${location.pathname === link.href ? 'text-white' : 'text-primary-300'}
                `}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Actions */}
          <div className="hidden lg:flex items-center gap-6">
            {isLoading ? (
              <div className="h-8 w-24 bg-primary-800 rounded-lg animate-skeleton" />
            ) : isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-[13px] font-semibold tracking-widest uppercase text-primary-200 hover:text-accent-400 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-accent-400 text-white text-xs font-bold flex items-center justify-center">
                      {firstName.charAt(0).toUpperCase()}
                    </span>
                    {firstName}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="!text-white hover:!bg-primary-800 text-[13px] font-semibold tracking-widest uppercase"
                  onClick={() => { void handleLogout(); }}
                >
                  Salir
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/iniciar-sesion"
                  className="text-[13px] font-semibold tracking-widest uppercase text-primary-200 hover:text-accent-400 transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link to="/registrarse">
                  <Button variant="secondary" size="sm" className="border-none rounded-full px-5 text-xs font-bold uppercase tracking-wider">
                    Registrarse
                  </Button>
                </Link>
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
            className="lg:hidden p-2 rounded-lg text-primary-200 hover:text-white hover:bg-primary-800 transition-colors cursor-pointer"
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
              className="fixed inset-0 top-16 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
          <div
            id="mobile-menu"
            role="navigation"
            aria-label="Menú móvil"
            className="fixed right-0 top-16 bottom-0 w-72 bg-primary-950 border-l border-primary-800 shadow-elevated z-50 lg:hidden animate-slide-in overflow-y-auto"
          >
              <div className="flex flex-col p-6 gap-2">
                {/* Auth user header for mobile */}
                {isAuthenticated && profile && (
                  <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-primary-900 rounded-xl border border-primary-800">
                    <span className="w-9 h-9 rounded-full bg-accent-400 text-primary-950 text-sm font-bold flex items-center justify-center">
                      {firstName.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{firstName}</p>
                      <p className="text-xs text-primary-200">{profile.email}</p>
                    </div>
                  </div>
                )}

                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={closeMobileMenu}
                    className={`
                      px-4 py-3 rounded-xl text-base font-medium transition-all duration-200
                      ${location.pathname === link.href
                        ? 'bg-accent-400 text-primary-950 font-bold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
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
                      px-4 py-3 rounded-xl text-base font-medium transition-all duration-200
                      ${location.pathname === '/dashboard'
                        ? 'bg-accent-400 text-primary-950 font-bold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    Mi panel
                  </Link>
                )}

                <hr className="my-3 border-primary-800" />

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
                        px-4 py-3 rounded-xl text-base font-medium transition-all duration-200
                        ${location.pathname === '/iniciar-sesion'
                          ? 'bg-accent-400 text-primary-950 font-bold'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }
                      `}
                    >
                      Iniciar sesión
                    </Link>
                    <Link to="/registrarse" onClick={closeMobileMenu} className="mt-2">
                      <Button variant="accent" size="md" fullWidth>
                        Registrarse
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </>
        )}
    </>
  );
}
