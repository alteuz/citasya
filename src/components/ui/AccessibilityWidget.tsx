import { useState, useEffect, useCallback } from 'react';
import { Button } from './Button';

type TextScale = 'normal' | 'large' | 'extra-large';

export function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [textSize, setTextSize] = useState<TextScale>(() => {
    return (localStorage.getItem('a11y-text-size') as TextScale) || 'normal';
  });
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('a11y-high-contrast') === 'true';
  });
  const [reduceMotion, setReduceMotion] = useState<boolean>(() => {
    return localStorage.getItem('a11y-reduce-motion') === 'true';
  });
  const [readingGuide, setReadingGuide] = useState<boolean>(() => {
    return localStorage.getItem('a11y-reading-guide') === 'true';
  });
  const [voiceAssistance, setVoiceAssistance] = useState<boolean>(() => {
    return localStorage.getItem('a11y-voice-assistance') === 'true';
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
      {readingGuide && (
        <div
          className="fixed left-0 right-0 h-8 pointer-events-none z-[99999] bg-accent-400/20 border-y-2 border-accent-400 mix-blend-difference -translate-y-1/2 transition-all duration-75"
          style={{ top: `${rulerTop}px` }}
          aria-hidden="true"
        />
      )}

      {/* Botón Flotante del Widget */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
        {isOpen && (
          <div className="mb-4 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-[#0a091f]/95 backdrop-blur-xl border border-[#211f4d] rounded-3xl p-6 shadow-2xl animate-fade-in text-white accessibility-widget-panel">
            <div className="flex items-center justify-between mb-5 border-b border-[#211f4d] pb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="text-xl">⚙️</span> Ajustes de Accesibilidad
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#cdc7f0] hover:text-white p-1 rounded-lg focus-visible:outline-2 focus-visible:outline-accent-400"
                aria-label="Cerrar panel de accesibilidad"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5">
              {/* Ajuste de Tamaño de Texto */}
              <div>
                <span className="block text-sm font-semibold text-[#e8e5f7] mb-2">
                  Tamaño del texto:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'large', 'extra-large'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTextSize(size)}
                      className={`
                        py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border
                        ${textSize === size
                          ? 'bg-accent-400 text-[#0d0d1a] border-accent-400'
                          : 'bg-[#131233] text-[#cdc7f0] border-[#25235c] hover:bg-[#1a1945]'
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
                <label className="flex items-center justify-between p-2.5 bg-[#131233] border border-[#25235c] rounded-xl cursor-pointer hover:bg-[#1a1945] transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">Alto Contraste</span>
                    <span className="text-[10px] text-[#9f99c7]">Colores de alta visibilidad</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="w-5 h-5 accent-accent-400 cursor-pointer"
                  />
                </label>

                {/* Guía de Lectura */}
                <label className="flex items-center justify-between p-2.5 bg-[#131233] border border-[#25235c] rounded-xl cursor-pointer hover:bg-[#1a1945] transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">Guía de Lectura</span>
                    <span className="text-[10px] text-[#9f99c7]">Regla visual para seguir el texto</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={readingGuide}
                    onChange={(e) => setReadingGuide(e.target.checked)}
                    className="w-5 h-5 accent-accent-400 cursor-pointer"
                  />
                </label>

                {/* Asistente de Voz */}
                <label className="flex items-center justify-between p-2.5 bg-[#131233] border border-[#25235c] rounded-xl cursor-pointer hover:bg-[#1a1945] transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">Lector de Voz</span>
                    <span className="text-[10px] text-[#9f99c7]">Escuchar texto al pasar el cursor</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceAssistance}
                    onChange={(e) => setVoiceAssistance(e.target.checked)}
                    className="w-5 h-5 accent-accent-400 cursor-pointer"
                  />
                </label>

                {/* Animaciones */}
                <label className="flex items-center justify-between p-2.5 bg-[#131233] border border-[#25235c] rounded-xl cursor-pointer hover:bg-[#1a1945] transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">Reducir Movimiento</span>
                    <span className="text-[10px] text-[#9f99c7]">Desactiva efectos visuales rápidos</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={reduceMotion}
                    onChange={(e) => setReduceMotion(e.target.checked)}
                    className="w-5 h-5 accent-accent-400 cursor-pointer"
                  />
                </label>
              </div>

              {/* Botón de reinicio */}
              <div className="pt-2 border-t border-[#25235c] flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAll}
                  className="text-xs !text-[#cdc7f0] hover:!text-white hover:!bg-[#1a1945] font-bold"
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
          className="w-14 h-14 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-950 font-bold text-2xl flex items-center justify-center shadow-lg transition-all duration-300 ease-out hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-2 accessibility-trigger-btn"
        >
          {isOpen ? '✕' : '♿'}
        </button>
      </div>
    </>
  );
}
