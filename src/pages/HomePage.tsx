import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence, MotionConfig, type Variants } from 'framer-motion';
import { ArrowRight, Building2, CalendarClock, ChevronDown, CircleCheck, Monitor, Search, X } from 'lucide-react';
import heroBgVideo from '@/assets/hero-bg.mp4';
import { useAuthContext } from '@/hooks/useAuthContext';
import { Footer } from '@/components/layout/Footer';
import { IconBadge } from '@/components/ui/IconBadge';

// ─── Movimiento ───────────────────────────────────────────────────────────────
// Una sola curva (ease-out exponencial) y un solo ritmo de escalonado para toda
// la portada: los elementos entran como una secuencia, no cada uno por su lado.
const EASE = [0.22, 1, 0.36, 1] as const;

const secuencia: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const aparecer: Variants = {
  oculto: { opacity: 0, y: 14, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: EASE } },
};

// Cada línea del titular sube desde detrás de una máscara.
const linea: Variants = {
  oculto: { y: '105%' },
  visible: { y: '0%', transition: { duration: 0.9, ease: EASE } },
};

// Cifras reales de la base de datos (EPS, sedes IPS y especialidades cargadas).
const CIFRAS = [
  { valor: '11', etiqueta: 'EPS vinculadas' },
  { valor: '32', etiqueta: 'Sedes en Bogotá' },
  { valor: '12', etiqueta: 'Especialidades' },
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
  const [videoListo, setVideoListo] = useState(false);
  const { isAuthenticated, logout, isLoading } = useAuthContext();
  const videoRef = useRef<HTMLVideoElement>(null);

  // ─── Movimiento reducido (opción del widget de accesibilidad) ───
  const [shouldReduceMotion, setShouldReduceMotion] = useState(() => {
    return document.documentElement.classList.contains('reduce-motion');
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setShouldReduceMotion(document.documentElement.classList.contains('reduce-motion'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    return () => observer.disconnect();
  }, []);

  // ─── Video: pausa con movimiento reducido; aparece con fundido al cargar ───
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.readyState >= 2) setVideoListo(true);
    if (shouldReduceMotion) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [shouldReduceMotion]);

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

  // ─── Menú móvil: Escape lo cierra ───
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMenuOpen]);

  // Con movimiento reducido todo arranca ya en su estado final.
  const inicial = shouldReduceMotion ? false : 'oculto';

  const navLinks = [
    { label: 'Inicio', path: '/' },
    { label: 'Agendar cita', path: '/buscar' },
    { label: 'Cómo funciona', path: '#como-funciona' },
    { label: 'EPS', path: '/directorio-eps' },
    { label: 'Ayuda', path: '#ayuda' }
  ];

  const irA = (path: string) => {
    if (path.startsWith('#')) {
      document.querySelector(path)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(path);
    }
  };

  return (
    <MotionConfig reducedMotion={shouldReduceMotion ? 'always' : 'user'}>
      <div className="relative w-full bg-black text-white overflow-x-hidden font-sans">

        {/* ─── Video de fondo: mismo negro que la página, sin recuadro visible ─── */}
        <video
          ref={videoRef}
          autoPlay={!shouldReduceMotion}
          loop
          muted
          playsInline
          aria-hidden="true"
          onLoadedData={() => setVideoListo(true)}
          className={`fixed inset-0 w-full h-full object-contain max-lg:top-10 max-lg:bottom-auto max-lg:h-[44svh] z-[1] pointer-events-none transition-opacity duration-[1400ms] ease-out ${videoListo ? 'opacity-100' : 'opacity-0'}`}
          onEnded={(e) => {
            // Garantiza loop sin cortes en navegadores que ignoran el atributo loop
            const video = e.currentTarget;
            video.currentTime = 0;
            void video.play();
          }}
        >
          <source src={heroBgVideo} type="video/mp4" />
        </video>
        <div className="fixed inset-0 z-[2] pointer-events-none velo-portada" />

        {/* ─── Portada (alto de pantalla) ─── */}
        <div className="relative z-20 min-h-svh flex flex-col">

          {/* Barra de navegación */}
          <motion.nav
            aria-label="Navegación principal"
            initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="w-full max-w-7xl mx-auto flex items-center justify-between gap-6 px-5 sm:px-8 pt-5"
          >
            <button type="button" onClick={() => navigate('/')} className="rounded-xl cursor-pointer" aria-label="CitasYA, ir al inicio">
              <Logo />
            </button>

            <div className="hidden lg:flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md p-1">
              {navLinks.map((link) => (
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
                type="button"
                onClick={() => setIsMenuOpen(true)}
                aria-label="Abrir menú de navegación"
                aria-expanded={isMenuOpen}
                className="lg:hidden w-11 h-11 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-white/[0.12] presionable"
              >
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
                  <line x1="1" y1="1" x2="17" y2="1" />
                  <line x1="1" y1="6" x2="17" y2="6" />
                  <line x1="1" y1="11" x2="17" y2="11" />
                </svg>
              </button>
            </div>
          </motion.nav>

          {/* Contenido de la portada, anclado abajo para dejar ver el logo del video */}
          <motion.div
            variants={secuencia}
            initial={inicial}
            animate="visible"
            className="flex-1 w-full max-w-7xl mx-auto px-5 sm:px-8 pt-[34svh] lg:pt-0 pb-8 md:pb-12 flex flex-col justify-end"
          >
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="max-w-2xl">
                <motion.div
                  variants={aparecer}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-md px-3 py-1.5 text-xs font-medium text-white/80"
                >
                  <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  Disponible 24/7 · Bogotá
                </motion.div>

                <h1 className="mt-5 font-serif text-hero text-white">
                  <span className="block overflow-hidden pb-[0.06em]">
                    <motion.span variants={linea} className="block">Agenda</motion.span>
                  </span>
                  <span className="block overflow-hidden pb-[0.1em] pr-[0.08em]">
                    <motion.span variants={linea} className="block">
                      <em className="italic text-accent">sin</em> filas.
                    </motion.span>
                  </span>
                </h1>

                <motion.p variants={aparecer} className="mt-5 max-w-md text-base md:text-lg leading-relaxed text-white/70">
                  Plataforma centralizada para gestionar tus citas con tu EPS en Bogotá. Rápido, seguro y accesible.
                </motion.p>

                <motion.div variants={aparecer} className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
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
                    className="inline-flex items-center justify-center gap-1.5 min-h-12 px-5 rounded-full text-base font-medium text-white/80 hover:text-white hover:bg-white/[0.06] transicion cursor-pointer"
                  >
                    Cómo funciona
                    <ChevronDown size={18} aria-hidden="true" />
                  </button>
                </motion.div>
              </div>

              {/* Cifras reales */}
              <motion.dl
                variants={aparecer}
                className="grid grid-cols-3 gap-3 pr-16 border-t border-white/10 pt-5 lg:gap-0 lg:pr-0 lg:border-t-0 lg:pt-0 lg:flex lg:divide-x lg:divide-white/10"
              >
                {CIFRAS.map((cifra) => (
                  <div key={cifra.etiqueta} className="flex flex-col-reverse justify-end gap-1 lg:px-8 lg:last:pr-0">
                    <dt className="text-xs sm:text-sm text-white/60 leading-snug">{cifra.etiqueta}</dt>
                    <dd className="font-serif text-stat text-white tabular-nums">{cifra.valor}</dd>
                  </div>
                ))}
              </motion.dl>
            </div>
          </motion.div>
        </div>

        {/* ─── Menú móvil ─── */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, ease: EASE }}
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col px-5 pt-5 pb-8 sm:px-8 overflow-y-auto"
            >
              <div className="w-full flex items-center justify-between">
                <Logo />
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Cerrar menú de navegación"
                  className="w-11 h-11 rounded-full border border-white/15 bg-white/[0.06] flex items-center justify-center cursor-pointer hover:bg-white/[0.12] presionable"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              <motion.div
                variants={secuencia}
                initial={inicial}
                animate="visible"
                className="flex flex-col mt-12"
              >
                {[
                  ...navLinks,
                  ...(isAuthenticated
                    ? [{ label: 'Mi Panel', path: '/dashboard' }]
                    : [{ label: 'Iniciar Sesión', path: '/iniciar-sesion' }, { label: 'Registrarse', path: '/registrarse' }]),
                ].map((link) => (
                  <motion.button
                    key={link.label}
                    type="button"
                    variants={aparecer}
                    onClick={() => { setIsMenuOpen(false); irA(link.path); }}
                    className="text-left font-serif text-4xl py-2.5 text-white/90 hover:text-white transicion cursor-pointer"
                  >
                    {link.label}
                  </motion.button>
                ))}
                {isAuthenticated && (
                  <motion.button
                    type="button"
                    variants={aparecer}
                    onClick={() => { setIsMenuOpen(false); void logout(); }}
                    className="text-left font-serif text-4xl py-2.5 text-error cursor-pointer"
                  >
                    Cerrar Sesión
                  </motion.button>
                )}
              </motion.div>

              <button
                type="button"
                onClick={() => { setIsMenuOpen(false); navigate('/buscar'); }}
                className="mt-auto inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full bg-brand text-white text-base font-semibold shadow-button hover:bg-brand-hover presionable cursor-pointer"
              >
                Agendar cita <ArrowRight size={18} aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── ¿Cómo funciona? ─── */}
        <section id="como-funciona" className="relative z-20 bg-black border-t border-white/10 py-24 md:py-32 px-5 sm:px-8">
          <div className="max-w-7xl mx-auto">
            <Revelar reducir={shouldReduceMotion} className="max-w-3xl">
              <p className="text-sm font-medium text-accent">¿Qué es CitasYA?</p>
              <h2 className="mt-3 text-4xl md:text-5xl text-white">Cómo funciona la plataforma</h2>
              <p className="mt-6 text-base md:text-lg leading-relaxed text-white/65">
                <strong className="font-semibold text-white">CitasYA</strong> es tu puerta de entrada inteligente a la salud en Bogotá. Somos una plataforma centralizada que conecta a los ciudadanos directamente con sus Entidades Promotoras de Salud (EPS), eliminando las filas físicas y telefónicas. Facilitamos la búsqueda de médicos, la consulta de especialidades y el agendamiento o reprogramación de citas en un entorno 100% digital, accesible e inclusivo para todas las edades.
              </p>
            </Revelar>

            <Revelar reducir={shouldReduceMotion} escalonar className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {PASOS.map((paso, i) => (
                <motion.article
                  key={paso.titulo}
                  variants={aparecer}
                  className="relative rounded-3xl border border-white/10 bg-white/[0.03] tarjeta-luz p-7 hover:border-white/20 hover:bg-white/[0.05] transicion"
                >
                  <div className="flex items-start justify-between">
                    <IconBadge icon={paso.icono} tone="brand" size="sm" />
                    <span className="font-serif text-2xl text-white/25 tabular-nums" aria-hidden="true">0{i + 1}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-white">
                    <span className="sr-only">Paso {i + 1}: </span>{paso.titulo}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{paso.texto}</p>
                </motion.article>
              ))}
            </Revelar>
          </div>
        </section>

        {/* ─── Ayuda y soporte ─── */}
        <section id="ayuda" className="relative z-20 bg-black border-t border-white/10 py-24 md:py-32 px-5 sm:px-8">
          <div className="max-w-7xl mx-auto">
            <Revelar reducir={shouldReduceMotion} className="max-w-3xl">
              <p className="text-sm font-medium text-accent">Soporte directo</p>
              <h2 className="mt-3 text-4xl md:text-5xl text-white">Centro de Ayuda</h2>
            </Revelar>

            <Revelar reducir={shouldReduceMotion} escalonar className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <motion.article variants={aparecer} className="rounded-3xl border border-white/10 bg-white/[0.03] tarjeta-luz p-7 md:p-8 flex flex-col gap-5">
                <IconBadge icon={Monitor} tone="brand" size="sm" />
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
              </motion.article>

              <motion.article variants={aparecer} className="rounded-3xl border border-white/10 bg-white/[0.03] tarjeta-luz p-7 md:p-8 flex flex-col gap-5">
                <IconBadge icon={Building2} tone="brand" size="sm" />
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
              </motion.article>
            </Revelar>
          </div>
        </section>

        <div className="relative z-20">
          <Footer />
        </div>
      </div>
    </MotionConfig>
  );
}

// ─── Revela un bloque al entrar en pantalla (una sola vez) ───────────────────
interface RevelarProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly reducir: boolean;
  /** Si es true, los hijos (motion con `variants={aparecer}`) entran escalonados. */
  readonly escalonar?: boolean;
}

function Revelar({ children, className = '', reducir, escalonar = false }: RevelarProps) {
  return (
    <motion.div
      variants={escalonar ? secuencia : aparecer}
      initial={reducir ? false : 'oculto'}
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
