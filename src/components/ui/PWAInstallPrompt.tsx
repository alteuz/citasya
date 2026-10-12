/**
 * PWAInstallPrompt — Barra flotante que invita al usuario a instalar la app.
 * Solo se muestra si el navegador emite el evento `beforeinstallprompt`.
 */
import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Verificar si ya fue descartado en esta sesión
    const dismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsVisible(false);
    }

    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  }, []);

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-fade-in sm:top-auto sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-sm">
      <div className="bg-surface-card text-text-primary border border-line-strong rounded-2xl p-4 shadow-elevated flex items-center gap-3">
        <span className="text-3xl shrink-0" aria-hidden="true">📱</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Instalar CitasYA</p>
          <p className="text-sm text-text-secondary mt-0.5">
            Agrega la app a tu pantalla de inicio para acceso rápido.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex items-center min-h-11 px-2 text-sm text-text-secondary underline underline-offset-2 hover:text-text-primary hover:no-underline cursor-pointer rounded-lg"
          >
            Ahora no
          </button>
          <button
            type="button"
            onClick={() => { void handleInstall(); }}
            className="inline-flex items-center min-h-11 bg-accent text-text-inverse text-sm font-semibold px-4 rounded-xl hover:bg-accent-hover presionable cursor-pointer"
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}
