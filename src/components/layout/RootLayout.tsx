import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AuthProvider } from '@/hooks/useAuth';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { AccessibilityWidget } from '@/components/ui/AccessibilityWidget';

export function RootLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  // ─── SCROLL TO HASH ANCHORS ON ROUTE / HASH CHANGE ───
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.substring(1);
      // Wait a frame to ensure the target element exists in the DOM
      const timer = setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.hash]);

  return (
    <AuthProvider>
      <div className={`flex flex-col min-h-screen ${isHomePage ? 'bg-surface' : 'fondo-app'}`}>
        {/* Degradado de la marca para los íconos de línea (.icono-degradado). No usa
            display:none: algunos navegadores no pintan degradados de un SVG oculto así. */}
        <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="degradado-icono" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#67f0ff" />
              <stop offset="0.5" stopColor="#5b8bff" />
              <stop offset="1" stopColor="#8b7bff" />
            </linearGradient>
          </defs>
        </svg>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-3 focus:bg-accent focus:text-text-inverse focus:font-semibold focus:rounded-lg focus:shadow-elevated"
        >
          Ir al contenido principal
        </a>
        {!isHomePage && <Navbar />}
        <main id="main-content" className="flex-1" tabIndex={-1}>
          <Outlet />
        </main>
        {!isHomePage && <Footer />}
        <AccessibilityWidget />
        <PWAInstallPrompt />
      </div>
    </AuthProvider>
  );
}
