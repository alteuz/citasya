import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Building2, CalendarClock, ChevronDown, CircleCheck, Monitor, Pause, Play, Search, X } from 'lucide-react';
import videoPortada from '@/assets/portada-720.mp4';
import { useAuthContext } from '@/hooks/useAuthContext';
import { Footer } from '@/components/layout/Footer';
import { IconBadge } from '@/components/ui/IconBadge';
import { POSTER_PORTADA } from '@/lib/portada';

// ─── Movimiento ───────────────────────────────────────────────────────────────
// Toda la animación de la portada es CSS (index.css), sin librerías:
//   · entrada (clases `entrada*`): corre aunque el JavaScript no haya cargado;
//   · efectos ligados al desplazamiento (`portada-alejar`, `portada-subir`,
//     `barra-fondo`): líneas de tiempo de scroll que corren en el compositor;
//   · menú móvil y revelado de secciones: transiciones CSS.
// El JavaScript solo decide estados (abrir menú, revelar, contar cifras).
// Todo se apaga con "Reducir movimiento" del widget o con la preferencia del
// sistema (ADR-0007).

/** Retraso de una animación de entrada o de revelado (variable CSS --retraso). */
const retraso = (ms: number) => ({ '--retraso': `${ms}ms` }) as CSSProperties;

// Cifras reales de la base de datos: EPS activas (habilitadas en Bogotá), sedes
// IPS del REPS y especialidades. Consulta del 15-oct-2026: 9, 32 y 12.
const CIFRAS = [
  { valor: 9, etiqueta: 'EPS habilitadas' },
  { valor: 32, etiqueta: 'Sedes en Bogotá' },
  { valor: 12, etiqueta: 'Especialidades' },
] as const;

const PASOS = [
  {
    icono: Search,
    titulo: 'Encuentra tu especialidad',
    texto: 'Selecciona la especialidad médica que necesitas y tu EPS correspondiente para filtrar las opciones disponibles de forma inmediata.',
  },
  {
    icono: CalendarClock,
    titulo: 'Elige médico y horario',
    texto: 'Compara profesionales calificados, revisa sus agendas en tiempo real y escoge el horario que mejor se adapte a tu vida.',
  },
  {
    icono: CircleCheck,
    titulo: 'Agenda e historial',
    texto: 'Confirma tus datos y agenda tu cita en segundos. Podrás consultar, descargar o reprogramar tus citas cuando quieras en tu panel personal.',
  },
] as const;

const CONTACTOS_EPS = [
  { nombre: 'Sanitas', correo: 'contacto@epssanitas.com' },
  { nombre: 'Sura', correo: 'afiliados@epssura.com.co' },
  { nombre: 'Compensar', correo: 'servicioalcliente@compensarsalud.com' },
  { nombre: 'Salud Total', correo: 'defensoria@saludtotal.com.co' },
  { nombre: 'Famisanar', correo: 'servicioalcliente@famisanar.com.co' },
  { nombre: 'Coosalud', correo: 'defensordelusuario@coosalud.com' },
] as const;

const NAV_LINKS = [
  { label: 'Inicio', path: '/' },
  { label: 'Agendar cita', path: '/buscar' },
  { label: 'Cómo funciona', path: '#como-funciona' },
  { label: 'EPS', path: '/directorio-eps' },
  { label: 'Ayuda', path: '#ayuda' },
] as const;

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <img src="/logo.png" alt="" className="h-10 w-10 object-contain shrink-0" />
    <span className="font-serif text-2xl tracking-tight text-white">
      Citas<span className="text-accent">YA</span>
    </span>
  </div>
);

export function HomePage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, logout, isLoading } = useAuthContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const botonMenuRef = useRef<HTMLButtonElement>(null);
  const cerrarMenuRef = useRef<HTMLButtonElement>(null);
  const reducir = useMovimientoReducido();
  useRevelarAlDesplazar(reducir);

  // ─── Video: carga diferida, pausa visible (WCAG 2.2.2) y movimiento reducido ───
  // El HTML trae solo el póster. El video (1,2 MB) se pide cuando la página
  // terminó de cargar y el navegador está libre, para que no compita con el
  // póster, el CSS y el JavaScript por el ancho de banda. Con "ahorro de datos"
  // no se descarga.
  const [videoActivo, setVideoActivo] = useState(false);
  const [videoPausado, setVideoPausado] = useState(false);

  useEffect(() => {
    const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conexion?.saveData) return;
    let cancelado = false;
    const activar = () => { if (!cancelado) setVideoActivo(true); };
    const programar = () => {
      if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(activar, { timeout: 2000 });
      else window.setTimeout(activar, 800);
    };
    if (document.readyState === 'complete') programar();
    else window.addEventListener('load', programar, { once: true });
    return () => {
      cancelado = true;
      window.removeEventListener('load', programar);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoActivo) return;
    if (reducir || videoPausado) {
      video.pause();
    } else {
      video.muted = true; // la reproducción automática solo se permite sin sonido
      video.play().catch(() => {});
    }
  }, [videoActivo, reducir, videoPausado]);

  // ─── Desplazamiento al ancla de la URL al montar ───
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.substring(1);
      const timer = setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // ─── Menú móvil: foco al abrir y al cerrar; Escape lo cierra ───
  const menuMontado = useRef(false);
  useEffect(() => {
    if (!menuMontado.current) {
      menuMontado.current = true;
      return;
    }
    if (isMenuOpen) cerrarMenuRef.current?.focus();
    else botonMenuRef.current?.focus();
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMenuOpen]);

  const irA = (path: string) => {
    if (path.startsWith('#')) {
      document.querySelector(path)?.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth' });
    } else {
      navigate(path);
    }
  };

  const enlacesMenu = [
    ...NAV_LINKS,
    ...(isAuthenticated
      ? [{ label: 'Mi Panel', path: '/dashboard' }]
      : [{ label: 'Iniciar Sesión', path: '/iniciar-sesion' }, { label: 'Registrarse', path: '/registrarse' }]),
  ];

  // Con el menú abierto, el resto de la página queda inerte (ni foco ni lector de pantalla).
  const fondoInerte = isMenuOpen || undefined;

  return (
    <div className="relative w-full bg-black text-white overflow-x-hidden font-sans">

      {/* ─── Video de fondo: mismo negro que la página, sin recuadro visible.
           Al desplazarse se aleja y se apaga un poco (CSS; no con movimiento reducido). ─── */}
      <div aria-hidden="true" className="portada-alejar fixed inset-0 z-[1] pointer-events-none origin-top lg:origin-center">
        <video
          ref={videoRef}
          poster={POSTER_PORTADA}
          src={videoActivo ? videoPortada : undefined}
          preload="none"
          loop
          muted
          playsInline
          tabIndex={-1}
          className="absolute inset-0 w-full h-full object-contain max-lg:top-10 max-lg:bottom-auto max-lg:h-[44svh]"
        />
      </div>
      <div className="fixed inset-0 z-[2] pointer-events-none velo-portada" />

      {/* ─── Barra de navegación fija: gana fondo al desplazarse ─── */}
      <header className="fixed inset-x-0 top-0 z-40" inert={fondoInerte}>
        <div aria-hidden="true" className="barra-fondo absolute inset-0 bg-black/70 backdrop-blur-xl border-b border-white/10" />
        <nav
          aria-label="Navegación principal"
          className="entrada-barra relative w-full max-w-7xl mx-auto flex items-center justify-between gap-6 px-5 sm:px-8 py-4"
        >
          <button type="button" onClick={() => navigate('/')} className="rounded-xl cursor-pointer" aria-label="CitasYA, ir al inicio">
            <Logo />
          </button>

          <div className="hidden lg:flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md p-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => irA(link.path)}
                className="inline-flex items-center min-h-10 px-4 rounded-full text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transicion cursor-pointer whitespace-nowrap"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isLoading && (
              <div className="hidden lg:flex items-center gap-2">
                {isAuthenticated ? (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="inline-flex items-center min-h-11 px-4 rounded-full text-sm font-medium text-white/80 hover:text-white transicion cursor-pointer"
                    >
                      Mi Panel
                    </button>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="inline-flex items-center min-h-11 px-4 rounded-full text-sm font-medium text-error hover:bg-error/10 transicion cursor-pointer"
                    >
                      Cerrar Sesión
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate('/iniciar-sesion')}
                      className="inline-flex items-center min-h-11 px-4 rounded-full text-sm font-medium text-white/80 hover:text-white transicion cursor-pointer"
                    >
                      Iniciar Sesión
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/registrarse')}
                      className="inline-flex items-center min-h-11 px-5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/85 presionable cursor-pointer"
                    >
                      Registrarse
                    </button>
                  </>
                )}
              </div>
            )}

            <button
              ref={botonMenuRef}
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Abrir menú de navegación"
              aria-expanded={isMenuOpen}
              aria-controls="menu-movil"
              className="lg:hidden w-11 h-11 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-white/[0.12] presionable"
            >
              <svg width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                <line x1="1" y1="1" x2="17" y2="1" />
                <line x1="1" y1="6" x2="17" y2="6" />
                <line x1="1" y1="11" x2="17" y2="11" />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* ─── Portada (alto de pantalla); sube y se desvanece al desplazarse (CSS) ─── */}
      <div className="portada-subir relative z-20 min-h-svh flex flex-col pt-[4.75rem]" inert={fondoInerte}>
        {/* Pausa del video de fondo: el movimiento dura más de 5 s, así que debe poder detenerse (WCAG 2.2.2). */}
        {!reducir && (
          <div className="relative w-full max-w-7xl mx-auto px-5 sm:px-8 flex justify-end">
            <button
              type="button"
              onClick={() => setVideoPausado((p) => !p)}
              aria-pressed={videoPausado}
              aria-label="Pausar la animación de fondo"
              className="entrada inline-flex items-center gap-2 min-h-11 px-3.5 rounded-full border border-white/15 bg-black/40 backdrop-blur-md text-xs font-medium text-white/75 hover:text-white hover:bg-white/[0.08] transicion cursor-pointer"
              style={retraso(900)}
            >
              {videoPausado ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
              <span aria-hidden="true">{videoPausado ? 'Reanudar' : 'Pausar'}</span>
            </button>
          </div>
        )}

        <div className="flex-1 w-full max-w-7xl mx-auto px-5 sm:px-8 pt-[24svh] lg:pt-0 pb-8 md:pb-12 flex flex-col justify-end">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-end lg:gap-12">
            {/* Titular original: mayúsculas, a la derecha, una palabra por línea.
                Los espacios entre palabras son nodos de texto reales: el lector
                de pantalla lee «Agenda Sin Filas.» y no una sola palabra. */}
            <h1 className="lg:order-2 flex flex-col items-end font-serif uppercase text-right text-hero text-white">
              <Palabra ms={150}>Agenda</Palabra>{' '}
              <Palabra ms={270} className="italic text-accent">Sin</Palabra>{' '}
              <Palabra ms={390}>Filas.</Palabra>
            </h1>

            <div className="lg:order-1 flex flex-col items-start">
              <div
                className="entrada inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white/80"
                style={retraso(250)}
              >
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                Disponible 24/7 · Bogotá
              </div>

              <p className="entrada mt-5 max-w-md text-base md:text-lg leading-relaxed text-white/70" style={retraso(350)}>
                Plataforma centralizada para gestionar tus citas con tu EPS en Bogotá. Rápido, seguro y accesible.
              </p>

              <div className="entrada mt-7 w-full flex flex-col sm:flex-row sm:items-center gap-3" style={retraso(450)}>
                <button
                  type="button"
                  onClick={() => navigate('/buscar')}
                  className="group inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full bg-brand text-white text-base font-semibold shadow-button hover:bg-brand-hover presionable cursor-pointer"
                >
                  Agendar cita
                  <ArrowRight size={18} aria-hidden="true" className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => irA('#como-funciona')}
                  className="group inline-flex items-center justify-center gap-1.5 min-h-12 px-5 rounded-full text-base font-medium text-white/80 hover:text-white hover:bg-white/[0.06] transicion cursor-pointer"
                >
                  Cómo funciona
                  <ChevronDown size={18} aria-hidden="true" className="transition-transform duration-200 ease-out group-hover:translate-y-0.5" />
                </button>
              </div>

              {/* Cifras reales: cuentan desde cero al aparecer */}
              <dl
                data-cifras
                className="entrada mt-8 w-full grid grid-cols-3 gap-3 pr-16 lg:pr-0 border-t border-white/10 pt-5"
                style={retraso(550)}
              >
                {CIFRAS.map((cifra) => (
                  <div key={cifra.etiqueta} className="flex flex-col-reverse justify-end gap-1">
                    <dt className="text-xs sm:text-sm text-white/60 leading-snug">{cifra.etiqueta}</dt>
                    <dd className="font-serif text-stat text-white tabular-nums">
                      <span className="sr-only">{cifra.valor}</span>
                      <Contador valor={cifra.valor} reducir={reducir} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Menú móvil (diálogo): transiciones CSS; inerte mientras está cerrado ─── */}
      <div
        id="menu-movil"
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        data-abierto={isMenuOpen}
        inert={!isMenuOpen}
        className="menu-movil fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col px-5 pt-5 pb-8 sm:px-8 overflow-y-auto"
      >
        <div className="w-full flex items-center justify-between">
          <Logo />
          <button
            ref={cerrarMenuRef}
            type="button"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Cerrar menú de navegación"
            className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.06] flex items-center justify-center cursor-pointer hover:bg-white/[0.12] presionable"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col mt-12">
          {enlacesMenu.map((link, i) => (
            <button
              key={link.label}
              type="button"
              data-item
              style={{ '--i': i } as CSSProperties}
              onClick={() => { setIsMenuOpen(false); irA(link.path); }}
              className="text-left font-serif text-4xl py-2.5 text-white/90 hover:text-white cursor-pointer"
            >
              {link.label}
            </button>
          ))}
          {isAuthenticated && (
            <button
              type="button"
              data-item
              style={{ '--i': enlacesMenu.length } as CSSProperties}
              onClick={() => { setIsMenuOpen(false); void logout(); }}
              className="text-left font-serif text-4xl py-2.5 text-error cursor-pointer"
            >
              Cerrar Sesión
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => { setIsMenuOpen(false); navigate('/buscar'); }}
          className="mt-auto inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full bg-brand text-white text-base font-semibold shadow-button hover:bg-brand-hover presionable cursor-pointer"
        >
          Agendar cita <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>

      {/* ─── ¿Cómo funciona? ─── */}
      <section id="como-funciona" inert={fondoInerte} className="relative z-20 bg-black border-t border-white/10 py-24 md:py-32 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div data-revelar className="max-w-3xl">
            <p className="text-sm font-medium text-accent">¿Qué es CitasYA?</p>
            <h2 className="mt-3 text-4xl md:text-5xl text-white">Cómo funciona la plataforma</h2>
            <p className="mt-6 text-base md:text-lg leading-relaxed text-white/65">
              <strong className="font-semibold text-white">CitasYA</strong> es tu puerta de entrada inteligente a la salud en Bogotá. Somos una plataforma centralizada que conecta a los ciudadanos directamente con sus Entidades Promotoras de Salud (EPS), eliminando las filas físicas y telefónicas. Facilitamos la búsqueda de médicos, la consulta de especialidades y el agendamiento o reprogramación de citas en un entorno 100% digital, accesible e inclusivo para todas las edades.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {PASOS.map((paso, i) => (
              <article key={paso.titulo} data-revelar style={retraso(i * 90)} className="h-full">
                <div className="levitar group relative h-full rounded-3xl border border-white/10 bg-white/[0.03] tarjeta-luz p-7 hover:border-white/20 hover:bg-white/[0.05]">
                  <div className="flex items-start justify-between">
                    <IconBadge icon={paso.icono} tone="brand" size="sm" className="icono-realce" />
                    <span className="font-serif text-2xl text-white/25 tabular-nums" aria-hidden="true">0{i + 1}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-white">
                    <span className="sr-only">Paso {i + 1}: </span>{paso.titulo}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{paso.texto}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Ayuda y soporte ─── */}
      <section id="ayuda" inert={fondoInerte} className="relative z-20 bg-black border-t border-white/10 py-24 md:py-32 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div data-revelar className="max-w-3xl">
            <p className="text-sm font-medium text-accent">Soporte directo</p>
            <h2 className="mt-3 text-4xl md:text-5xl text-white">Centro de Ayuda</h2>
          </div>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <article data-revelar className="group rounded-3xl border border-white/10 bg-white/[0.03] tarjeta-luz p-7 md:p-8 flex flex-col gap-5 hover:border-white/20 transicion">
              <IconBadge icon={Monitor} tone="brand" size="sm" className="icono-realce" />
              <h3 className="text-xl font-semibold text-white">Soporte técnico de la página</h3>
              <p className="text-sm leading-relaxed text-white/65">
                Si experimentas problemas técnicos con el funcionamiento de CitasYA, como errores al iniciar sesión, problemas al agendar o fallas en el visualizador, por favor contacta a nuestro equipo de desarrollo:
              </p>
              <div className="mt-auto rounded-2xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs text-white/60">Correo de soporte</p>
                <a href="mailto:soporte@citasya.com" className="inline-flex items-center min-h-11 text-base font-semibold text-accent hover:text-accent-hover underline-offset-4 hover:underline break-all">
                  soporte@citasya.com
                </a>
              </div>
            </article>

            <article data-revelar style={retraso(90)} className="group rounded-3xl border border-white/10 bg-white/[0.03] tarjeta-luz p-7 md:p-8 flex flex-col gap-5 hover:border-white/20 transicion">
              <IconBadge icon={Building2} tone="brand" size="sm" className="icono-realce" />
              <h3 className="text-xl font-semibold text-white">Asuntos de tu EPS</h3>
              <p className="text-sm leading-relaxed text-white/65">
                Si tu consulta está relacionada con autorizaciones de servicios, reclamos, entrega de medicamentos o peticiones directamente relacionadas con tu EPS, comunícate a sus canales oficiales:
              </p>
              {/* role="list": Safari/VoiceOver quita la semántica de lista cuando list-style es none. */}
              {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list">
                {CONTACTOS_EPS.map((eps) => (
                  <li key={eps.nombre} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <p className="text-sm font-semibold text-white">{eps.nombre}</p>
                    <a href={`mailto:${eps.correo}`} className="inline-flex items-center min-h-11 text-xs text-accent hover:text-accent-hover underline-offset-4 hover:underline break-all">
                      {eps.correo}
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <div className="relative z-20" inert={fondoInerte}>
        <Footer />
      </div>
    </div>
  );
}

// ─── Movimiento reducido: widget de accesibilidad o preferencia del sistema ───
// Se lee después de montar: así el primer render del navegador coincide con el
// HTML prerenderizado y React lo hidrata sin diferencias. Mientras tanto, las
// reglas de index.css ya anulan las animaciones CSS con ambas preferencias.
function useMovimientoReducido(): boolean {
  const [reducir, setReducir] = useState(false);
  useEffect(() => {
    const raiz = document.documentElement;
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const actualizar = () => setReducir(raiz.classList.contains('reduce-motion') || consulta.matches);
    actualizar();
    const observador = new MutationObserver(actualizar);
    observador.observe(raiz, { attributes: true, attributeFilter: ['class'] });
    consulta.addEventListener('change', actualizar);
    return () => {
      observador.disconnect();
      consulta.removeEventListener('change', actualizar);
    };
  }, []);
  return reducir;
}

// ─── Revelado al desplazarse (mejora progresiva) ──────────────────────────────
// El HTML prerenderizado trae todo visible (legible sin JavaScript). Al montar,
// solo los bloques [data-revelar] que aún están fuera de la pantalla se ocultan
// y aparecen cuando la persona llega a ellos (transición CSS en index.css).
function useRevelarAlDesplazar(reducir: boolean) {
  useEffect(() => {
    if (reducir || typeof IntersectionObserver === 'undefined') return;
    const pendientes = Array.from(document.querySelectorAll<HTMLElement>('[data-revelar]'))
      .filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.9);
    for (const el of pendientes) el.dataset.estado = 'oculto';
    const observador = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        (entrada.target as HTMLElement).dataset.estado = 'visible';
        observador.unobserve(entrada.target);
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    for (const el of pendientes) observador.observe(el);
    return () => {
      observador.disconnect();
      for (const el of pendientes) el.dataset.estado = 'visible';
    };
  }, [reducir]);
}

// ─── Palabra del titular: sube desde detrás de una máscara (CSS) ─────────────
function Palabra({ children, ms, className = '' }: { readonly children: ReactNode; readonly ms: number; readonly className?: string }) {
  return (
    <span className="block overflow-hidden pb-[0.04em] pr-[0.08em] -mr-[0.08em]">
      <span className={`entrada-palabra block ${className}`} style={retraso(ms)}>{children}</span>
    </span>
  );
}

// ─── Cifra que cuenta desde cero la primera vez que aparece ──────────────────
// El HTML trae el valor final (legible sin JavaScript). Solo se cuenta si el
// bloque de cifras todavía no es visible (su entrada CSS no ha empezado): si el
// JavaScript llegó tarde no se "rebobina" lo que la persona ya leyó. El valor
// real va en un sr-only aparte: el lector de pantalla no oye la cuenta.
// requestAnimationFrame + curva exponencial de salida (sin librerías).
function Contador({ valor, reducir }: { readonly valor: number; readonly reducir: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducir) return;
    const bloque = el.closest<HTMLElement>('[data-cifras]');
    if (bloque && Number(getComputedStyle(bloque).opacity) > 0.05) return;

    const DURACION = 1400;
    const RETRASO = 350;
    const curva = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
    let inicio: number | null = null;
    let cuadro = 0;
    el.textContent = '0';
    const paso = (ahora: number) => {
      inicio ??= ahora + RETRASO;
      const t = Math.min(1, Math.max(0, (ahora - inicio) / DURACION));
      el.textContent = String(Math.round(valor * curva(t)));
      if (t < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    // Si la pestaña está oculta, requestAnimationFrame no corre: el valor final
    // queda garantizado al terminar el tiempo de la animación.
    const respaldo = window.setTimeout(() => { el.textContent = String(valor); }, RETRASO + DURACION + 250);
    return () => {
      cancelAnimationFrame(cuadro);
      window.clearTimeout(respaldo);
      el.textContent = String(valor);
    };
  }, [reducir, valor]);

  return <span ref={ref} aria-hidden="true">{valor}</span>;
}
