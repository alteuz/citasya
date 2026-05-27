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
      <div className="flex flex-col min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent-500 focus:text-white focus:rounded-lg"
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
