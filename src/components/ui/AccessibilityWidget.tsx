import { useState, useEffect, useCallback } from 'react';
import { Button } from './Button';
import { Accessibility, X } from 'lucide-react';

type TextScale = 'normal' | 'large' | 'extra-large';

// En el prerenderizado (Node) no existe localStorage: se usan los valores por
// defecto, que son los mismos que ve un visitante nuevo.
const leerPreferencia = (clave: string): string | null =>
  typeof localStorage === 'undefined' ? null : localStorage.getItem(clave);

export function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [textSize, setTextSize] = useState<TextScale>(() => {
    return (leerPreferencia('a11y-text-size') as TextScale) || 'normal';
  });
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return leerPreferencia('a11y-high-contrast') === 'true';
  });
  const [reduceMotion, setReduceMotion] = useState<boolean>(() => {
    return leerPreferencia('a11y-reduce-motion') === 'true';
  });
  const [readingGuide, setReadingGuide] = useState<boolean>(() => {
    return leerPreferencia('a11y-reading-guide') === 'true';
  });
  const [voiceAssistance, setVoiceAssistance] = useState<boolean>(() => {
    return leerPreferencia('a11y-voice-assistance') === 'true';
  });

  const [rulerTop, setRulerTop] = useState(0);

  // Guardar y aplicar configuración
  useEffect(() => {
    localStorage.setItem('a11y-text-size', textSize);
    const htmlEl = document.documentElement;
    if (textSize === 'large') {
      htmlEl.style.fontSize = '115%';
    } else if (textSize === 'extra-large') {
      htmlEl.style.fontSize = '130%';
    } else {
      htmlEl.style.fontSize = '100%';
    }
  }, [textSize]);

  useEffect(() => {
    localStorage.setItem('a11y-high-contrast', String(highContrast));
    const htmlEl = document.documentElement;
    if (highContrast) {
      htmlEl.classList.add('high-contrast');
    } else {
      htmlEl.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('a11y-reduce-motion', String(reduceMotion));
    const htmlEl = document.documentElement;
    if (reduceMotion) {
      htmlEl.classList.add('reduce-motion');
    } else {
      htmlEl.classList.remove('reduce-motion');
    }
  }, [reduceMotion]);

  useEffect(() => {
    localStorage.setItem('a11y-reading-guide', String(readingGuide));
  }, [readingGuide]);

  useEffect(() => {
    localStorage.setItem('a11y-voice-assistance', String(voiceAssistance));
  }, [voiceAssistance]);

  // Manejador de la guía de lectura (regla)
  useEffect(() => {
    if (!readingGuide) return;
    
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e 
        ? (e.touches[0]?.clientY ?? 0) 
        : (e as MouseEvent).clientY;
      setRulerTop(clientY);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [readingGuide]);

  // Manejador del asistente de voz (lectura al pasar el mouse o enfocar)
  useEffect(() => {
    if (!voiceAssistance) return;

    let lastText = '';
    const handleHover = (e: MouseEvent | FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const el = target.closest('button, a, h1, h2, h3, h4, label, input, select, [role="button"]') as HTMLElement | null;
      if (!el) return;

      let textToSpeak = '';
      if (el.getAttribute('aria-label')) {
        textToSpeak = el.getAttribute('aria-label')!;
      } else if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        const input = el as HTMLInputElement;
        const labelText = input.labels?.[0]?.textContent || '';
        textToSpeak = `${labelText || 'Campo'}. ${input.placeholder || ''}`;
      } else {
        textToSpeak = el.textContent?.trim() || '';
      }

      if (textToSpeak && textToSpeak !== lastText) {
        lastText = textToSpeak;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'es-ES';
        window.speechSynthesis.speak(utterance);
      }
    };

    const handleLeave = () => {
      lastText = '';
    };

    window.addEventListener('mouseover', handleHover);
    window.addEventListener('focusin', handleHover);
    window.addEventListener('mouseout', handleLeave);
    window.addEventListener('focusout', handleLeave);

    return () => {
      window.speechSynthesis.cancel();
      window.removeEventListener('mouseover', handleHover);
      window.removeEventListener('focusin', handleHover);
      window.removeEventListener('mouseout', handleLeave);
      window.removeEventListener('focusout', handleLeave);
    };
  }, [voiceAssistance]);

  const resetAll = useCallback(() => {
    setTextSize('normal');
    setHighContrast(false);
    setReduceMotion(false);
    setReadingGuide(false);
    setVoiceAssistance(false);
  }, []);

  return (
    <>
      {/* Guía de Lectura (Regla visual) */}
      {/* Solo tras el primer movimiento del puntero: así el HTML inicial es el
          mismo para todos y la hidratación no difiere del prerenderizado. */}
      {readingGuide && rulerTop > 0 && (
        <div
          className="fixed left-0 right-0 h-8 pointer-events-none z-[99999] bg-accent/20 border-y-2 border-accent mix-blend-difference -translate-y-1/2"
          style={{ top: `${rulerTop}px` }}
          aria-hidden="true"
        />
      )}

      {/* Botón Flotante del Widget */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
        {isOpen && (
          // H-43: con el texto «Muy grande» el panel no cabía en pantallas de 768 px de alto y su
          // título quedaba fuera de la vista. Ahora nunca supera la altura visible y se desplaza.
          <div className="mb-4 w-[calc(100vw-2rem)] sm:w-80 max-w-sm max-h-[calc(100dvh-7.5rem)] overflow-y-auto overscroll-contain bg-surface/95 backdrop-blur-xl border border-line rounded-3xl p-6 shadow-elevated animate-fade-in text-text-primary accessibility-widget-panel">
            <div className="flex items-center justify-between mb-5 border-b border-line pb-3">
              <h2 className="font-sans text-lg font-semibold flex items-center gap-2">
                <Accessibility size={20} aria-hidden="true" className="text-accent" /> Ajustes de Accesibilidad
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center min-h-11 min-w-11 -mr-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-hover presionable cursor-pointer"
                aria-label="Cerrar panel de accesibilidad"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Ajuste de Tamaño de Texto */}
              <div>
                <span className="block text-sm font-semibold text-text-primary mb-2">
                  Tamaño del texto:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'large', 'extra-large'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTextSize(size)}
                      className={`
                        min-h-11 py-2 text-xs font-bold rounded-xl presionable cursor-pointer border
                        ${textSize === size
                          ? 'bg-accent text-text-inverse border-accent'
                          : 'bg-surface-card text-text-secondary border-line-input hover:bg-surface-hover hover:text-text-primary'
                        }
                      `}
                    >
                      {size === 'normal' ? 'Normal' : size === 'large' ? 'Grande' : 'Muy Grande'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles Rápidos */}
              <div className="space-y-3 pt-2">
                {/* Alto Contraste */}
                <label className="flex items-center justify-between gap-3 min-h-14 px-3 py-2.5 bg-surface-card border border-line rounded-xl cursor-pointer hover:bg-surface-hover hover:border-line-strong">
                  <span className="flex flex-col text-sm font-bold text-text-primary">
                    Alto Contraste
                    <span className="text-xs font-normal text-text-muted">Colores de alta visibilidad</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="w-5 h-5 accent-accent cursor-pointer"
                  />
                </label>

                {/* Guía de Lectura */}
                <label className="flex items-center justify-between gap-3 min-h-14 px-3 py-2.5 bg-surface-card border border-line rounded-xl cursor-pointer hover:bg-surface-hover hover:border-line-strong">
                  <span className="flex flex-col text-sm font-bold text-text-primary">
                    Guía de Lectura
                    <span className="text-xs font-normal text-text-muted">Regla visual para seguir el texto</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={readingGuide}
                    onChange={(e) => setReadingGuide(e.target.checked)}
                    className="w-5 h-5 accent-accent cursor-pointer"
                  />
                </label>

                {/* Asistente de Voz */}
                <label className="flex items-center justify-between gap-3 min-h-14 px-3 py-2.5 bg-surface-card border border-line rounded-xl cursor-pointer hover:bg-surface-hover hover:border-line-strong">
                  <span className="flex flex-col text-sm font-bold text-text-primary">
                    Lector de Voz
                    <span className="text-xs font-normal text-text-muted">Escuchar texto al pasar el cursor</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={voiceAssistance}
                    onChange={(e) => setVoiceAssistance(e.target.checked)}
                    className="w-5 h-5 accent-accent cursor-pointer"
                  />
                </label>

                {/* Animaciones */}
                <label className="flex items-center justify-between gap-3 min-h-14 px-3 py-2.5 bg-surface-card border border-line rounded-xl cursor-pointer hover:bg-surface-hover hover:border-line-strong">
                  <span className="flex flex-col text-sm font-bold text-text-primary">
                    Reducir Movimiento
                    <span className="text-xs font-normal text-text-muted">Desactiva efectos visuales rápidos</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={reduceMotion}
                    onChange={(e) => setReduceMotion(e.target.checked)}
                    className="w-5 h-5 accent-accent cursor-pointer"
                  />
                </label>
              </div>

              {/* Botón de reinicio */}
              <div className="pt-3 border-t border-line flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAll}
                  className="text-xs font-bold"
                >
                  Restablecer todo
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Botón Gatillo */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Panel de opciones de accesibilidad para adultos mayores"
          className="w-14 h-14 rounded-full bg-brand hover:bg-brand-hover text-white ring-1 ring-white/15 flex items-center justify-center shadow-button transicion active:scale-95 cursor-pointer focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-2 accessibility-trigger-btn"
        >
          {isOpen ? <X size={24} aria-hidden="true" /> : <Accessibility size={26} aria-hidden="true" />}
        </button>
      </div>
    </>
  );
}
