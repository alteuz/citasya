import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  ALargeSmall, ArrowRight, Building2, CalendarClock, ChevronDown, CircleCheck, CirclePause,
  Contrast, MapPin, Monitor, Pause, Play, Ruler, Search, ShieldCheck, Smartphone, Stethoscope,
  Video, Volume2, X, type LucideIcon,
} from 'lucide-react';
import videoPortada from '@/assets/portada-720.mp4';
import { useAuthContext } from '@/hooks/useAuthContext';
import { Footer } from '@/components/layout/Footer';
import { FotoDiferida } from '@/components/marca/FotoDiferida';
import { Logo } from '@/components/marca/Logo';
import { EnlaceBoton } from '@/components/ui/EnlaceBoton';
import { estilosBoton } from '@/components/ui/estilosBoton';
import { IconBadge } from '@/components/ui/IconBadge';
import { VALORES_MARCA } from '@/lib/marca';
import { POSTER_PORTADA } from '@/lib/portada';

// ─── Movimiento ───────────────────────────────────────────────────────────────
// Toda la animación de la portada es CSS (index.css), sin librerías:
//   · entrada (clases `entrada*`): corre aunque el JavaScript no haya cargado;
//     la barra cae escalonada, el punto se enciende, cada palabra del titular
//     sube dentro de su máscara y las tarjetas de vidrio suben una tras otra;
//   · efectos ligados al desplazamiento (`portada-alejar`, `portada-subir`,
//     `barra-fondo`): líneas de tiempo de scroll que corren en el compositor;
//   · auroras del fondo: derivan despacio y se detienen con «Pausar»;
//   · menú móvil y revelado de secciones: transiciones CSS.
// El JavaScript solo decide estados (abrir menú, revelar, contar cifras).
// Todo se apaga con "Reducir movimiento" del widget o con la preferencia del
// sistema (ADR-0007).

/** Retraso de una animación de entrada o de revelado (variable CSS --retraso). */
const retraso = (ms: number) => ({ '--retraso': `${ms}ms` }) as CSSProperties;

/** Primeras interacciones que activan el video de la portada (H-39). */
const EVENTOS_INTERACCION = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

// Cifras reales de la base de datos: EPS activas (habilitadas en Bogotá), sedes
// IPS del REPS y especialidades. Consulta del 15-oct-2026: 9, 32 y 12.
const CIFRAS = [
  { valor: 9, etiqueta: 'EPS habilitadas', detalle: 'Activas', icono: ShieldCheck },
  { valor: 32, etiqueta: 'Sedes en Bogotá', detalle: 'IPS', icono: MapPin },
  { valor: 12, etiqueta: 'Especialidades', detalle: 'Médicas', icono: Stethoscope },
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

// Opciones reales del widget de accesibilidad (AccessibilityWidget) y de la app instalable.
const AJUSTES: readonly { readonly icono: LucideIcon; readonly texto: string }[] = [
  { icono: ALargeSmall, texto: 'Texto más grande' },
  { icono: Contrast, texto: 'Alto contraste' },
  { icono: Volume2, texto: 'Lector de voz' },
  { icono: Ruler, texto: 'Guía de lectura' },
  { icono: CirclePause, texto: 'Reducir movimiento' },
  { icono: Smartphone, texto: 'Instalable en el celular' },
];

const NAV_LINKS = [
  { label: 'Inicio', path: '/' },
  { label: 'Agendar cita', path: '/buscar' },
  { label: 'Cómo funciona', path: '#como-funciona' },
  { label: 'EPS', path: '/directorio-eps' },
  { label: 'Ayuda', path: '#ayuda' },
] as const;

export function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, logout, isLoading } = useAuthContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const botonMenuRef = useRef<HTMLButtonElement>(null);
  const cerrarMenuRef = useRef<HTMLButtonElement>(null);
  const reducir = useMovimientoReducido();
  useRevelarAlDesplazar(reducir);

  // ─── Video: carga diferida, pausa visible (WCAG 2.2.2) y movimiento reducido ───
  // El HTML trae solo el póster, que es el primer fotograma del video. El video
  // (1,2 MB) se pide con la primera interacción de la persona (mover el mouse,
  // tocar, desplazarse o usar el teclado), nunca antes de que la página termine
  // de cargar. Con «ahorro de datos» no se descarga.
  //
  // Por qué con la interacción (H-39): si el video empieza a reproducirse
  // mientras Lighthouse mide, Chrome cuenta su primer fotograma como un nuevo
  // LCP más grande que el póster. En el CI, una de cada tres corridas de la
  // portada marcaba unos 3,5 s, frente a 2,3 s en las demás, sin cambios de
  // código. Lighthouse no interactúa con la página, así que el LCP medido es el
  // del póster, el mismo que ve la persona. Para la persona nada cambia: el
  // video sigue al póster en cuanto mueve el mouse o toca la pantalla.
  const [videoActivo, setVideoActivo] = useState(false);
  const [videoPausado, setVideoPausado] = useState(false);

  useEffect(() => {
    const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conexion?.saveData) return;
    let cancelado = false;
    const opciones: AddEventListenerOptions = { once: true, passive: true };
    const activar = () => {
      quitar();
      if (!cancelado) setVideoActivo(true);
    };
    const quitar = () => EVENTOS_INTERACCION.forEach((evento) => window.removeEventListener(evento, activar));
    const escuchar = () => EVENTOS_INTERACCION.forEach((evento) => window.addEventListener(evento, activar, opciones));
    if (document.readyState === 'complete') escuchar();
    else window.addEventListener('load', escuchar, { once: true });
    return () => {
      cancelado = true;
      quitar();
      window.removeEventListener('load', escuchar);
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

  const irASeccion = (ancla: string) => {
    document.querySelector(ancla)?.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth' });
  };

  // H-46: navegar es un enlace (<a>), no un botón. Funciona antes de que cargue el
  // JavaScript (la portada es HTML prerenderizado) y se puede abrir en otra pestaña.
  const enlace = (
    link: { readonly label: string; readonly path: string },
    className: string,
    extra: Record<string, unknown> = {},
    alPulsar?: () => void,
  ) =>
    link.path.startsWith('#') ? (
      <a
        key={link.label}
        href={link.path}
        onClick={(evento) => { evento.preventDefault(); alPulsar?.(); irASeccion(link.path); }}
        className={className}
        {...extra}
      >
        {link.label}
      </a>
    ) : (
      <Link key={link.label} to={link.path} onClick={alPulsar} className={className} {...extra}>
        {link.label}
      </Link>
    );

  const enlacesMenu = [
    ...NAV_LINKS,
    ...(isAuthenticated
      ? [{ label: 'Mi Panel', path: '/dashboard' }]
      : [{ label: 'Iniciar Sesión', path: '/iniciar-sesion' }, { label: 'Registrarse', path: '/registrarse' }]),
  ];

  // Con el menú abierto, el resto de la página queda inerte (ni foco ni lector de pantalla).
  const fondoInerte = isMenuOpen || undefined;

  return (
    <div
      className="fondo-app relative w-full text-text-primary overflow-x-hidden font-sans"
      data-pausado={String(videoPausado)}
    >

      {/* ─── Barra de navegación fija: cae escalonada al entrar y gana fondo al desplazarse ─── */}
      <header className="fixed inset-x-0 top-0 z-40" inert={fondoInerte}>
        <div aria-hidden="true" className="barra-fondo absolute inset-0 bg-surface/75 backdrop-blur-xl">
          <div className="linea-luz absolute inset-x-0 bottom-0 opacity-70" />
        </div>
        <nav
          aria-label="Navegación principal"
          className="relative w-full max-w-7xl mx-auto flex items-center justify-between gap-6 px-5 sm:px-8 py-4"
        >
          <Link to="/" className="entrada-barra rounded-xl" aria-label="CitasYA, ir al inicio">
            <Logo />
          </Link>

          <div
            className="entrada-barra hidden lg:flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md p-1 shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]"
            style={retraso(90)}
          >
            {NAV_LINKS.map((link) => enlace(link, "inline-flex items-center min-h-10 px-4 rounded-full text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.08] transicion cursor-pointer whitespace-nowrap"))}
          </div>

          <div className="entrada-barra flex items-center gap-2" style={retraso(180)}>
            {!isLoading && (
              <div className="hidden lg:flex items-center gap-2">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center min-h-11 px-4 rounded-full text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transicion"
                    >
                      Mi Panel
                    </Link>
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
                    <EnlaceBoton to="/iniciar-sesion" variant="accent" size="sm" className="px-5 whitespace-nowrap">
                      Iniciar Sesión
                    </EnlaceBoton>
                    <EnlaceBoton to="/registrarse" variant="primary" size="sm" className="px-5 whitespace-nowrap">
                      Registrarse
                    </EnlaceBoton>
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

      {/* ─── Portada (alto de pantalla): texto | escena del logo | cifras; sube y se desvanece al desplazarse (CSS) ─── */}
      {/* El fondo azul marino es opaco a propósito: la escena se mezcla en modo
          «pantalla» con lo que hay pintado dentro de esta capa, y así el negro del
          video desaparece sobre el azul en vez de verse como un recuadro. */}
      <div className="portada-subir cielo-portada relative z-20 min-h-svh flex flex-col pt-[4.75rem]" inert={fondoInerte}>
        {/* Auroras de la marca y retícula tenue (decorativas; se detienen con «Pausar»).
            Se ubican desde arriba y en rem: si la altura de la portada cambia al llegar
            la fuente web, no se mueven (un `top` en % o un `bottom` sí contarían como
            desplazamiento de diseño, CLS). */}
        <div aria-hidden="true" className="decorativo absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="aurora aurora-a -left-[18rem] -top-[20rem] h-[48rem] w-[48rem] [--aurora:rgb(88_67_252/0.34)]" />
          <div className="aurora aurora-b -right-[14rem] top-[11rem] h-[40rem] w-[40rem] [--aurora:rgb(0_233_252/0.16)]" />
          <div className="aurora aurora-a left-[16%] top-[30rem] h-[42rem] w-[66rem] [--aurora:rgb(29_105_252/0.3)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgb(126_160_255/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(126_160_255/0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_30%,#000_20%,transparent_80%)]" />
        </div>
        {/* Pausa de la animación de fondo: el movimiento dura más de 5 s, así que debe poder detenerse (WCAG 2.2.2). */}
        {!reducir && (
          <div className="absolute inset-x-0 top-[4.75rem] z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 flex justify-end pointer-events-none [&>*]:pointer-events-auto">
            <button
              type="button"
              onClick={() => setVideoPausado((p) => !p)}
              aria-pressed={videoPausado}
              aria-label="Pausar la animación de fondo"
              className="entrada vidrio inline-flex items-center gap-2 min-h-11 px-4 rounded-full text-xs font-semibold text-text-secondary hover:text-text-primary transicion cursor-pointer"
              style={retraso(900)}
            >
              {videoPausado ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
              <span aria-hidden="true">{videoPausado ? 'Reanudar' : 'Pausar'}</span>
            </button>
          </div>
        )}

        <div className="flex-1 w-full max-w-7xl mx-auto px-5 sm:px-8 pt-4 pb-10 lg:pt-10 lg:pb-16 grid content-center items-center gap-x-6 gap-y-6 lg:gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)_minmax(0,0.6fr)]">
          {/* Escena: el logo de vidrio en video. El fondo negro del video desaparece
              con el modo «pantalla» y solo queda su luz sobre el azul marino. La mezcla
              ocurre dos veces: el video sobre el aro y el halo (dentro de la escena), y
              la escena entera sobre la portada. */}
          <div
            aria-hidden="true"
            className="portada-alejar video-luz relative order-1 lg:order-2 justify-self-center w-[min(70vw,33svh)] lg:w-[min(122%,70svh)] aspect-square"
          >
            <div className="aro-vidrio absolute inset-[9%]" />
            <div className="decorativo absolute inset-[16%] rounded-full bg-[radial-gradient(closest-side,rgb(29_105_252/0.55),rgb(88_67_252/0.18)_60%,transparent)]" />
            <video
              ref={videoRef}
              poster={POSTER_PORTADA}
              src={videoActivo ? videoPortada : undefined}
              preload="none"
              loop
              muted
              playsInline
              tabIndex={-1}
              width={720}
              height={720}
              className="video-luz entrada-escena relative h-full w-full object-contain"
            />
          </div>

          {/* Texto y cifras por encima de la escena (z-10): la escena es más ancha que su
              columna y, en alto contraste (sin mezcla), su fondo negro taparía el texto. */}
          <div className="relative z-10 order-2 lg:order-1 flex flex-col items-start">
            <div
              className="entrada inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-md pl-3 pr-3.5 py-1.5 text-xs font-semibold tracking-wide text-text-secondary"
              style={retraso(250)}
            >
              <span className="entrada-punto relative flex h-2 w-2" aria-hidden="true" style={retraso(330)}>
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_rgb(0_233_252/0.9)]" />
              </span>
              Disponible 24/7 · Bogotá
            </div>

            {/* Titular: cada palabra sube dentro de su máscara. Los espacios entre
                palabras son nodos de texto reales: el lector de pantalla lee
                «Agenda Sin Filas.» y no una sola palabra. */}
            <h1 className="mt-5 lg:mt-6 flex flex-row flex-wrap gap-x-[0.26em] lg:flex-col lg:items-start font-display font-extrabold text-hero tracking-[-0.045em] text-text-primary">
              <Palabra ms={150}>Agenda</Palabra>{' '}
              <Palabra ms={270} className="texto-degradado">Sin</Palabra>{' '}
              <Palabra ms={390}>Filas.</Palabra>
            </h1>

            <p className="entrada mt-6 max-w-md text-base md:text-lg leading-relaxed text-text-secondary" style={retraso(460)}>
              Plataforma centralizada para gestionar tus citas con tu EPS en Bogotá. Rápido, seguro y accesible.
            </p>

            <div className="entrada mt-8 w-full flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3" style={retraso(560)}>
              <EnlaceBoton to="/buscar" variant="primary" size="md" className="group whitespace-nowrap min-h-13 px-7">
                Agendar cita
                <ArrowRight size={20} aria-hidden="true" className="transition-transform duration-200 ease-out group-hover:translate-x-1" />
              </EnlaceBoton>
              <a
                href="#como-funciona"
                onClick={(evento) => { evento.preventDefault(); irASeccion('#como-funciona'); }}
                className={estilosBoton({ variant: 'accent', size: 'md', className: 'group whitespace-nowrap min-h-13 px-7' })}
              >
                Cómo funciona
                <ChevronDown size={20} aria-hidden="true" className="transition-transform duration-200 ease-out group-hover:translate-y-0.5" />
              </a>
            </div>
          </div>

          {/* Cifras reales en tarjetas de vidrio: suben una tras otra y cuentan desde cero */}
          <dl
            data-cifras
            className="entrada relative z-10 order-3 grid grid-cols-3 gap-2.5 sm:gap-4 lg:grid-cols-1 lg:justify-self-end lg:w-full lg:max-w-[15rem]"
            style={retraso(620)}
          >
            {CIFRAS.map((cifra, i) => (
              <div key={cifra.etiqueta} className="entrada vidrio rounded-[1.25rem] p-3 sm:p-5" style={retraso(700 + i * 120)}>
                {/* En el celular la etiqueta va en minúsculas y sin tracking: en mayúsculas espaciadas no cabe en un tercio de pantalla. */}
                <dt className="rotulo flex items-center gap-1.5 text-[0.6875rem] leading-tight max-sm:normal-case max-sm:tracking-normal max-sm:font-semibold sm:text-xs text-text-muted [overflow-wrap:anywhere]">
                  <cifra.icono size={14} aria-hidden="true" className="hidden sm:block shrink-0 text-accent" />
                  {cifra.etiqueta}
                </dt>
                <dd className="mt-3 sm:mt-5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                  <span className="font-display font-light text-[2rem] sm:text-stat leading-none tracking-[-0.04em] text-text-primary tabular-nums">
                    <span className="sr-only">{cifra.valor}</span>
                    <Contador valor={cifra.valor} reducir={reducir} />
                  </span>
                  <span className="rotulo text-[0.625rem] sm:text-xs text-accent">{cifra.detalle}</span>
                </dd>
              </div>
            ))}
          </dl>
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
        className="menu-movil fixed inset-0 z-50 bg-surface/95 backdrop-blur-xl flex flex-col px-5 pt-5 pb-8 sm:px-8 overflow-y-auto"
      >
        <div aria-hidden="true" className="decorativo pointer-events-none absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(closest-side,rgb(88_67_252/0.3),transparent)]" />
        <div className="relative w-full flex items-center justify-between">
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

        <div className="relative flex flex-col mt-12">
          {enlacesMenu.map((link, i) => enlace(link, "text-left font-display text-4xl font-bold tracking-[-0.03em] py-2.5 text-text-secondary hover:text-text-primary cursor-pointer", { 'data-item': true, style: { '--i': i } as CSSProperties }, () => setIsMenuOpen(false)))}
          {isAuthenticated && (
            <button
              type="button"
              data-item
              style={{ '--i': enlacesMenu.length } as CSSProperties}
              onClick={() => { setIsMenuOpen(false); void logout(); }}
              className="text-left font-display text-4xl font-bold tracking-[-0.03em] py-2.5 text-error cursor-pointer"
            >
              Cerrar Sesión
            </button>
          )}
        </div>

        <EnlaceBoton
          to="/buscar"
          onClick={() => setIsMenuOpen(false)}
          variant="primary"
          size="lg"
          className="relative mt-auto"
        >
          Agendar cita <ArrowRight size={20} aria-hidden="true" />
        </EnlaceBoton>
      </div>

      {/* ─── Valores de la marca: tres placas de vidrio ─── */}
      <section aria-label="Por qué CitasYA" inert={fondoInerte} className="relative z-20 px-5 sm:px-8 pb-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {VALORES_MARCA.map((valor, i) => (
            <article
              key={valor.titulo}
              data-revelar
              style={retraso(i * 90)}
              className="levitar group vidrio rounded-3xl p-5 sm:p-6 flex items-center gap-4"
            >
              <IconBadge icon={valor.icono} tone="brand" size="md" className="icono-realce" />
              <div>
                <h2 className="font-sans text-lg font-semibold tracking-[-0.01em] text-text-primary">{valor.titulo}</h2>
                <p className="text-sm text-text-muted">{valor.texto}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ─── ¿Cómo funciona? ─── */}
      <section id="como-funciona" inert={fondoInerte} className="relative z-20 py-24 md:py-32 px-5 sm:px-8 scroll-mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 items-center">
            <div data-revelar>
              <p className="rotulo text-xs text-accent">¿Qué es CitasYA?</p>
              <h2 className="mt-4 text-4xl md:text-5xl text-text-primary">
                Cómo funciona la <span className="texto-degradado">plataforma</span>
              </h2>
              <p className="mt-6 text-base md:text-lg leading-relaxed text-text-secondary">
                <strong className="font-semibold text-text-primary">CitasYA</strong> es tu puerta de entrada inteligente a la salud en Bogotá. Somos una plataforma centralizada que conecta a los ciudadanos directamente con sus Entidades Promotoras de Salud (EPS), eliminando las filas físicas y telefónicas. Facilitamos la búsqueda de médicos, la consulta de especialidades y el agendamiento o reprogramación de citas en un entorno 100% digital, accesible e inclusivo para todas las edades.
              </p>
            </div>

            {/* Foto con el tratamiento de la marca y dos placas de vidrio (decorativas). */}
            <figure data-revelar style={retraso(120)} className="relative mx-2 sm:mx-6 lg:mx-0">
              <div className="borde-luz relative overflow-hidden rounded-[2rem] shadow-[0_40px_90px_-40px_rgb(29_105_252/0.65)]">
                <FotoDiferida
                  src="/imagenes/consulta-1200.webp"
                  srcSet="/imagenes/consulta-640.webp 640w, /imagenes/consulta-1200.webp 1200w"
                  sizes="(min-width: 1024px) 36rem, 92vw"
                  width={1200}
                  height={675}
                  alt="Una médica conversa con un paciente mayor en su consultorio."
                />
                <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(3_10_31/0)_45%,rgb(3_10_31/0.7))]" />
              </div>
              <div aria-hidden="true" className="vidrio absolute -bottom-6 left-4 sm:-left-6 rounded-2xl pl-3 pr-5 py-3 flex items-center gap-3">
                <span className="boton-primario grid h-10 w-10 place-items-center rounded-xl text-white">
                  <CircleCheck size={20} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-text-primary">Cita agendada</span>
                  <span className="block text-xs text-text-muted">La ves en tu panel personal</span>
                </span>
              </div>
              <div aria-hidden="true" className="vidrio absolute -top-5 right-4 sm:-right-6 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-sm font-semibold text-text-primary">
                <Video size={18} className="text-accent" />
                Presencial o telemedicina
              </div>
            </figure>
          </div>

          <div className="relative mt-24 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Línea de luz que une los tres pasos (decorativa) */}
            <div aria-hidden="true" className="linea-luz absolute hidden md:block top-[3.75rem] left-[12%] right-[12%]" />
            {PASOS.map((paso, i) => (
              <article key={paso.titulo} data-revelar style={retraso(i * 90)} className="relative h-full">
                <div className="levitar group vidrio relative h-full rounded-3xl p-7">
                  <div className="flex items-start justify-between">
                    <IconBadge icon={paso.icono} tone="brand" size="md" className="icono-realce" />
                    <span className="font-display text-5xl font-extralight tracking-[-0.04em] text-white/20 tabular-nums" aria-hidden="true">0{i + 1}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-text-primary">
                    <span className="sr-only">Paso {i + 1}: </span>{paso.titulo}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{paso.texto}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Para todos: accesibilidad ─── */}
      <section aria-labelledby="titulo-para-todos" inert={fondoInerte} className="relative z-20 py-24 md:py-32 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto grid gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16 items-center">
          <figure data-revelar className="relative order-2 lg:order-1 mx-2 sm:mx-6 lg:mx-0">
            <div className="borde-luz relative overflow-hidden rounded-[2rem] shadow-[0_40px_90px_-40px_rgb(88_67_252/0.6)]">
              <FotoDiferida
                src="/imagenes/para-todos-1200.webp"
                srcSet="/imagenes/para-todos-640.webp 640w, /imagenes/para-todos-1200.webp 1200w"
                sizes="(min-width: 1024px) 34rem, 92vw"
                width={1200}
                height={980}
                alt="Una mujer mayor sonríe mientras usa su celular en casa."
              />
              <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(200deg,rgb(3_10_31/0)_50%,rgb(3_10_31/0.6))]" />
            </div>
            <div aria-hidden="true" className="vidrio absolute -bottom-7 right-4 sm:-right-6 w-60 rounded-2xl p-4">
              <p className="rotulo text-[0.625rem] text-text-muted">Ajustes de accesibilidad</p>
              <div className="mt-3 space-y-2.5">
                {['Texto más grande', 'Alto contraste'].map((texto, i) => (
                  <div key={texto} className="flex items-center justify-between gap-3 text-sm font-medium text-text-primary">
                    {texto}
                    <span className={`relative h-5 w-9 rounded-full ${i === 0 ? 'boton-primario' : 'bg-surface-strong'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white ${i === 0 ? 'right-0.5' : 'left-0.5'}`} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </figure>

          <div data-revelar className="order-1 lg:order-2">
            <p className="rotulo text-xs text-accent">Para todos</p>
            <h2 id="titulo-para-todos" className="mt-4 text-4xl md:text-5xl text-text-primary">
              Diseñado para <span className="texto-degradado">todas las edades</span>
            </h2>
            <p className="mt-6 text-base md:text-lg leading-relaxed text-text-secondary">
              Letra más grande, alto contraste y lectura en voz alta: ajusta CitasYA a tu manera con el botón de accesibilidad, en la esquina inferior derecha de la pantalla.
            </p>
            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AJUSTES.map(({ icono: Icono, texto }) => (
                <li key={texto} className="tarjeta flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-text-primary">
                  <span aria-hidden="true" className="icono-degradado grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-link">
                    <Icono size={18} strokeWidth={1.75} />
                  </span>
                  {texto}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Ayuda y soporte ─── */}
      <section id="ayuda" inert={fondoInerte} className="relative z-20 py-24 md:py-32 px-5 sm:px-8 scroll-mt-16">
        <div className="max-w-7xl mx-auto">
          <div data-revelar className="max-w-3xl">
            <p className="rotulo text-xs text-accent">Soporte directo</p>
            <h2 className="mt-4 text-4xl md:text-5xl text-text-primary">Centro de Ayuda</h2>
          </div>

          <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <article data-revelar className="group vidrio rounded-3xl p-7 md:p-8 flex flex-col gap-5 hover:border-accent/30 transicion">
              <IconBadge icon={Monitor} tone="brand" size="md" className="icono-realce" />
              <h3 className="text-xl font-semibold text-text-primary">Soporte técnico de la página</h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                Si experimentas problemas técnicos con el funcionamiento de CitasYA, como errores al iniciar sesión, problemas al agendar o fallas en el visualizador, repórtalos al equipo del proyecto:
              </p>
              <div className="mt-auto rounded-2xl border border-white/10 bg-surface/60 p-4">
                <p className="text-xs text-text-muted">Reportes del proyecto (repositorio público)</p>
                <a href="https://github.com/alteuz/citasya/issues" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-11 text-base font-semibold text-accent hover:text-accent-hover underline-offset-4 hover:underline break-all">
                  github.com/alteuz/citasya/issues
                  <span className="sr-only"> (se abre en una pestaña nueva)</span>
                </a>
              </div>
            </article>

            <article data-revelar style={retraso(90)} className="group vidrio rounded-3xl p-7 md:p-8 flex flex-col gap-5 hover:border-accent/30 transicion">
              <IconBadge icon={Building2} tone="brand" size="md" className="icono-realce" />
              <h3 className="text-xl font-semibold text-text-primary">Asuntos de tu EPS</h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                Si tu consulta está relacionada con autorizaciones de servicios, reclamos, entrega de medicamentos o peticiones directamente relacionadas con tu EPS, comunícate con sus canales oficiales. En el directorio están los datos de las 9 EPS habilitadas en Bogotá y sus sedes de atención.
              </p>
              <EnlaceBoton to="/directorio-eps" variant="accent" size="sm" className="mt-auto self-start px-5">
                Ver el directorio de EPS
                <ArrowRight size={16} aria-hidden="true" />
              </EnlaceBoton>
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
// El relleno inferior de la máscara deja ver los descendentes (la «g» de
// «Agenda») y el margen negativo lo compensa para no separar las líneas.
function Palabra({ children, ms, className = '' }: { readonly children: ReactNode; readonly ms: number; readonly className?: string }) {
  return (
    <span className="block overflow-hidden pb-[0.18em] -mb-[0.14em] pr-[0.08em] -mr-[0.08em]">
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
