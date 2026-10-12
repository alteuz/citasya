import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import heroBgVideo from '@/assets/hero-bg.mp4';
import { useAuthContext } from '@/hooks/useAuthContext';
import { Footer } from '@/components/layout/Footer';

const Logo = ({ dark = false }: { dark?: boolean }) => (
  <div className="flex items-center gap-3">
    <img
      src="/logo.png"
      alt="CitasYA"
      className="h-14 w-14 object-contain shrink-0"
    />
    <span className={`font-serif text-logo tracking-tight font-normal ${dark ? 'text-text-primary' : 'text-white'}`}>
      Citas<span className="text-accent">YA</span>
    </span>
  </div>
);

export function HomePage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);
  const { isAuthenticated, logout, isLoading } = useAuthContext();
  const videoRef = useRef<HTMLVideoElement>(null);

  // ─── ACCESSIBILITY REDUCE MOTION STATE ───
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

  // ─── REDUCE MOTION VIDEO CONTROL ───
  useEffect(() => {
    if (videoRef.current) {
      if (shouldReduceMotion) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [shouldReduceMotion]);

  // ─── MOUNT SCROLL TO HASH ───
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

  // Motion transitions
  const transition = [0.22, 1, 0.36, 1] as const;

  const fadeDown = (index: number) => ({
    initial: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: shouldReduceMotion ? 0 : index * 0.1,
        duration: shouldReduceMotion ? 0 : 0.6,
        ease: transition
      }
    }
  });

  const fadeUp = (index: number) => ({
    initial: shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: shouldReduceMotion ? 0 : index * 0.12,
        duration: shouldReduceMotion ? 0 : 0.6,
        ease: transition
      }
    }
  });

  const wordSlideUp = (delay: number) => ({
    initial: shouldReduceMotion ? { y: 0 } : { y: '110%' },
    animate: { 
      y: 0,
      transition: {
        delay: shouldReduceMotion ? 0 : delay,
        duration: shouldReduceMotion ? 0 : 0.7,
        ease: transition
      }
    }
  });

  const navLinks = [
    { label: 'Inicio', path: '/' },
    { label: 'Agendar cita', path: '/buscar' },
    { label: 'Cómo funciona', path: '#como-funciona' },
    { label: 'EPS', path: '/directorio-eps' },
    { label: 'Ayuda', path: '#ayuda' }
  ];

  return (
    <MotionConfig reducedMotion={shouldReduceMotion ? "always" : "user"}>
      <div className="relative w-full text-white overflow-x-hidden font-sans scroll-smooth bg-black">
        
        {/* ─── HERO SCREEN CONTAINER (100vh) ─── */}
        <div className="relative w-full min-h-screen flex flex-col justify-between select-none">
          
      {/* ─── VIDEO BACKGROUND ─── */}
      <video
        ref={videoRef}
        autoPlay={!shouldReduceMotion}
        loop
        muted
        playsInline
        aria-hidden="true"
        className="fixed inset-0 w-full h-full object-contain z-[1] pointer-events-none"
        onEnded={(e) => {
          // Garantiza loop sin cortes en navegadores que ignoran el atributo loop
          const video = e.currentTarget;
          video.currentTime = 0;
          void video.play();
        }}
      >
        <source src={heroBgVideo} type="video/mp4" />
      </video>


      {/* ─── GRADIENT OVERLAY ─── */}
      <div 
        className="fixed inset-0 z-[2] pointer-events-none velo-portada"
      />

      {/* ─── NAVIGATION BAR (Top) ─── */}
      <nav className="relative z-30 w-full flex items-center justify-between px-5 sm:px-8 md:px-8 pt-5 md:pt-5">
        {/* Left: Logo */}
        <motion.div 
          variants={fadeDown(0)} 
          initial="initial" 
          animate="animate"
          className="cursor-pointer"
          onClick={() => navigate('/')}
        >
          <Logo />
        </motion.div>

        {/* Center: Links (hidden on mobile, visible md+) */}
        <div className="hidden md:flex items-center gap-8 lg:gap-10">
          {navLinks.map((link, idx) => (
            <motion.button
              key={link.label}
              variants={fadeDown(idx + 1)}
              initial="initial"
              animate="animate"
              onClick={() => {
                if (link.path.startsWith('#')) {
                  const el = document.querySelector(link.path);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                } else {
                  navigate(link.path);
                }
              }}
              className="nav-link-underline inline-flex items-center min-h-11 text-caption font-semibold tracking-widest uppercase text-white/80 hover:text-accent transicion cursor-pointer"
            >
              {link.label}
            </motion.button>
          ))}
        </div>

        {/* Right: Actions / Hamburger */}
        <div className="flex items-center gap-6">
          {!isLoading && (
            <div className="hidden md:flex items-center gap-6">
              {isAuthenticated ? (
                <>
                  <motion.button
                    variants={fadeDown(6)}
                    initial="initial"
                    animate="animate"
                    onClick={() => navigate('/dashboard')}
                    className="nav-link-underline inline-flex items-center min-h-11 text-caption font-semibold tracking-widest uppercase text-white/80 hover:text-accent cursor-pointer"
                  >
                    Mi Panel
                  </motion.button>
                  <motion.button
                    variants={fadeDown(7)}
                    initial="initial"
                    animate="animate"
                    onClick={() => void logout()}
                    className="inline-flex items-center min-h-11 text-caption font-semibold tracking-widest uppercase text-error hover:opacity-80 transicion cursor-pointer"
                  >
                    Cerrar Sesión
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    variants={fadeDown(6)}
                    initial="initial"
                    animate="animate"
                    onClick={() => navigate('/iniciar-sesion')}
                    className="nav-link-underline inline-flex items-center min-h-11 text-caption font-semibold tracking-widest uppercase text-white/80 hover:text-accent cursor-pointer"
                  >
                    Iniciar Sesión
                  </motion.button>
                  {/* Texto oscuro (text-inverse) sobre el cian de la marca: contraste ≥ 10:1. */}
                  <motion.button
                    variants={fadeDown(7)}
                    initial="initial"
                    animate="animate"
                    onClick={() => navigate('/registrarse')}
                    className="inline-flex items-center min-h-11 bg-accent hover:bg-accent-hover text-text-inverse px-5 rounded-full text-xs font-bold uppercase tracking-wider presionable hover:scale-105 cursor-pointer shadow-glow"
                  >
                    Registrarse
                  </motion.button>
                </>
              )}
            </div>
          )}

          <motion.button
            variants={fadeDown(8)}
            initial="initial"
            animate="animate"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Abrir menú de navegación"
            className="w-11 h-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white/25 presionable"
          >
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="0" y1="1" x2="18" y2="1" />
              <line x1="0" y1="6" x2="18" y2="6" />
              <line x1="0" y1="11" x2="18" y2="11" />
            </svg>
          </motion.button>
        </div>
      </nav>

      {/* ─── STATS ROW (Middle Section) ─── */}
      <div className="relative z-20 flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:flex sm:justify-end sm:px-8 sm:gap-8 md:gap-10 mt-16 md:mt-0">
        {/* Stat 1 */}
        <motion.div 
          variants={fadeUp(2)} 
          initial="initial" 
          animate="animate" 
          className="text-right cursor-default select-none"
        >
          <div className="font-sans font-semibold text-white text-stat tracking-tight tabular-nums">
            <span className="text-accent text-superscript align-super font-semibold">+</span >50
          </div>
          <div className="text-xs font-semibold tracking-normal sm:tracking-widest uppercase text-white/60 whitespace-pre-line leading-tight mt-2.5 hyphens-auto">
            {"EPS\nDISPONIBLES"}
          </div>
        </motion.div>

        {/* Stat 2 */}
        <motion.div 
          variants={fadeUp(3)} 
          initial="initial" 
          animate="animate" 
          className="text-right cursor-default select-none"
        >
          <div className="font-sans font-semibold text-white text-stat tracking-tight tabular-nums">
            <span className="text-accent text-superscript align-super font-semibold">+</span >200
          </div>
          <div className="text-xs font-semibold tracking-normal sm:tracking-widest uppercase text-white/60 whitespace-pre-line leading-tight mt-2.5 hyphens-auto">
            {"ESPECIALIDADES\nMÉDICAS"}
          </div>
        </motion.div>

        {/* Stat 3 */}
        <motion.div 
          variants={fadeUp(4)} 
          initial="initial" 
          animate="animate" 
          className="text-right cursor-default select-none"
        >
          <div className="font-sans font-semibold text-white text-stat tracking-tight tabular-nums">
            <span className="text-accent text-superscript align-super font-semibold">+</span >10K
          </div>
          <div className="text-xs font-semibold tracking-normal sm:tracking-widest uppercase text-white/60 whitespace-pre-line leading-tight mt-2.5 hyphens-auto">
            {"CITAS\nAGENDADAS"}
          </div>
        </motion.div>
      </div>

      {/* ─── BOTTOM SECTION ─── */}
      <div className="relative z-20 px-5 sm:px-8 md:px-8 pb-8 md:pb-10 flex flex-col gap-5 md:gap-8 mt-auto">
        
        {/* Row A: Tagline + CTA */}
        <motion.div 
          variants={fadeUp(5)}
          initial="initial"
          animate="animate"
          className="flex items-center justify-between gap-4 border-b border-white/10 pb-5 md:pb-6"
        >
          {/* Left: Tagline */}
          <p className="text-xs font-semibold tracking-widest uppercase text-white/60 leading-normal hover:text-accent transicion cursor-default select-none">
            TU SALUD,<br />SIN FILAS<br />SIN ESPERAS<br />EN BOGOTÁ
          </p>

          {/* Right: CTA Button */}
          <button 
            onClick={() => navigate('/buscar')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <span className="text-base sm:text-xl text-accent font-semibold uppercase tracking-wide group-hover:opacity-85 transicion">
              Agendar Cita
            </span>
            <div className="w-7 h-7 rounded-full border border-accent flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:scale-110 transicion">
              <ArrowUpRight size={12} className="text-accent group-hover:text-text-inverse group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transicion" />
            </div>
          </button>
        </motion.div>

        {/* Row B: Description + Main Heading */}
        <div className="flex items-end justify-between gap-3 sm:gap-4">
          {/* Left Description Column */}
          <div className="w-36 sm:w-48 shrink-0 flex flex-col gap-3">
            {/* Pill Badge */}
            <motion.div 
              variants={fadeUp(3)}
              initial="initial"
              animate="animate"
              className="inline-flex items-center gap-2 bg-accent/12 border border-accent/30 rounded-full px-3.5 py-1.5 w-fit shadow-glow"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              <span className="text-xs font-bold tracking-widest uppercase text-accent">
                Disponible 24/7
              </span>
            </motion.div>

            {/* Description Text */}
            <motion.p 
              variants={fadeUp(6)}
              initial="initial"
              animate="animate"
              className="text-xs font-semibold tracking-widest uppercase text-white/60 leading-relaxed hover:text-white/80 transicion cursor-default select-none"
            >
              Plataforma centralizada para gestionar tus citas con tu EPS en Bogotá. Rápido, seguro y accesible.
            </motion.p>
          </div>

          {/* Right Heading Column */}
          <h1 className="flex flex-col items-end select-none font-serif text-white uppercase text-right text-hero leading-display">
            <span className={`block p-6 -m-6 transicion ${animationCompleted ? '' : 'overflow-hidden'}`}>
              <motion.span 
                variants={wordSlideUp(0.4)} 
                initial="initial" 
                animate="animate"
                className={`transicion duration-200 cursor-default inline-block origin-right`}
              >
                Agenda
              </motion.span>
            </span>
            <span className={`block p-6 -m-6 transicion ${animationCompleted ? '' : 'overflow-hidden'}`}>
              <motion.span 
                variants={wordSlideUp(0.54)} 
                initial="initial" 
                animate="animate" 
                className={`text-accent italic font-normal transicion cursor-default inline-block origin-right`}
              >
                Sin
              </motion.span>
            </span>
            <span className={`block p-6 -m-6 transicion ${animationCompleted ? '' : 'overflow-hidden'}`}>
              <motion.span 
                variants={wordSlideUp(0.68)} 
                initial="initial" 
                animate="animate"
                onAnimationComplete={() => setAnimationCompleted(true)}
                className={`transicion duration-200 cursor-default inline-block origin-right`}
              >
                Filas.
              </motion.span>
            </span>
          </h1>
        </div>
      </div>
      </div>

      {/* ─── MOBILE MENU OVERLAY ─── */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: '-100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ duration: 0.5, ease: transition }}
            className="fixed inset-0 z-50 bg-black flex flex-col p-5 sm:p-8 overflow-y-auto"
          >
            {/* Top row */}
            <div className="w-full flex items-center justify-between">
              <Logo />
              
              <button
                onClick={() => setIsMenuOpen(false)}
                aria-label="Cerrar menú de navegación"
                className="w-11 h-11 rounded-full bg-white/10 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white/20 presionable"
              >
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Vertical list of links */}
            <div className="flex flex-col gap-7 mt-16">
              {navLinks.map((link) => {
                const isAnchor = link.path.startsWith('#');
                return (
                  <button
                    key={link.label}
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (isAnchor) {
                        const el = document.querySelector(link.path);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      } else {
                        navigate(link.path);
                      }
                    }}
                    className="text-left text-3xl font-semibold tracking-widest uppercase text-white cursor-pointer hover:text-accent transicion"
                  >
                    {link.label}
                  </button>
                );
              })}

              {/* Botones de Iniciar sesión, Registro, Mi Panel y Cerrar Sesión en menú móvil */}
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate('/dashboard');
                    }}
                    className="text-left text-3xl font-semibold tracking-widest uppercase text-white cursor-pointer hover:text-accent transicion"
                  >
                    Mi Panel
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      void logout();
                    }}
                    className="text-left text-3xl font-semibold tracking-widest uppercase text-error cursor-pointer hover:text-error transicion"
                  >
                    Cerrar Sesión
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate('/iniciar-sesion');
                    }}
                    className="text-left text-3xl font-semibold tracking-widest uppercase text-white cursor-pointer hover:text-accent transicion"
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate('/registrarse');
                    }}
                    className="text-left text-3xl font-semibold tracking-widest uppercase text-white cursor-pointer hover:text-accent transicion"
                  >
                    Registrarse
                  </button>
                </>
              )}
            </div>

            {/* Bottom CTA */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/buscar');
              }}
              className="mt-auto pt-8 text-left text-xl font-semibold tracking-wide uppercase text-accent flex items-center gap-1.5 cursor-pointer hover:opacity-85 transicion"
            >
              Agendar Cita <span aria-hidden="true">↗</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SECTION: ¿CÓMO FUNCIONA? ─── */}
      <section 
        id="como-funciona" 
        className="relative z-20 py-24 px-5 sm:px-8 md:px-16 lg:px-24 bg-black/90 border-t border-white/10 text-white"
      >
        <div className="max-w-6xl mx-auto flex flex-col gap-12">
          {/* Section Heading */}
          <motion.div 
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-3"
          >
            <span className="text-xs font-bold tracking-widest uppercase text-accent">
              ¿Qué es CitasYA?
            </span>
            <h2 className="text-3xl md:text-5xl font-serif font-normal">
              Cómo funciona la plataforma
            </h2>
            <div className="w-16 h-1 bg-accent mt-2 rounded-full" />
          </motion.div>
 
          {/* Description Block */}
          <motion.p 
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-base sm:text-lg text-white/70 leading-relaxed max-w-4xl"
          >
            <strong>CitasYA</strong> es tu puerta de entrada inteligente a la salud en Bogotá. Somos una plataforma centralizada que conecta a los ciudadanos directamente con sus Entidades Promotoras de Salud (EPS), eliminando las filas físicas y telefónicas. Facilitamos la búsqueda de médicos, la consulta de especialidades y el agendamiento o reprogramación de citas en un entorno 100% digital, accesible e inclusivo para todas las edades.
          </motion.p>
 
          {/* Timeline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <motion.div 
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-surface-card/60 border border-line rounded-2xl p-6 flex flex-col gap-4 hover:border-accent/30 transicion cursor-default select-none"
            >
              <span className="text-3xl">🔍</span>
              <h3 className="text-xl font-serif text-white">1. Encuentra tu Especialidad</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Selecciona la especialidad médica que necesitas y tu EPS correspondiente para filtrar las opciones disponibles de forma inmediata.
              </p>
            </motion.div>
            
            <motion.div 
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-surface-card/60 border border-line rounded-2xl p-6 flex flex-col gap-4 hover:border-accent/30 transicion cursor-default select-none"
            >
              <span className="text-3xl">📅</span>
              <h3 className="text-xl font-serif text-white">2. Elige Médico y Horario</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Compara profesionales calificados, revisa sus agendas en tiempo real y escoge el horario que mejor se adapte a tu vida.
              </p>
            </motion.div>
            
            <motion.div 
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-surface-card/60 border border-line rounded-2xl p-6 flex flex-col gap-4 hover:border-accent/30 transicion cursor-default select-none"
            >
              <span className="text-3xl">✅</span>
              <h3 className="text-xl font-serif text-white">3. Agenda e Historial</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Confirma tus datos y agenda tu cita en segundos. Podrás consultar, descargar o reprogramar tus citas cuando quieras en tu panel personal.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
 
      {/* ─── SECTION: AYUDA Y SOPORTE ─── */}
      <section 
        id="ayuda" 
        className="relative z-20 py-24 px-5 sm:px-8 md:px-16 lg:px-24 bg-black border-t border-white/10 text-white"
      >
        <div className="max-w-6xl mx-auto flex flex-col gap-12">
          {/* Section Heading */}
          <motion.div 
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-3"
          >
            <span className="text-xs font-bold tracking-widest uppercase text-accent">
              Soporte Directo
            </span>
            <h2 className="text-3xl md:text-5xl font-serif font-normal">
              Centro de Ayuda
            </h2>
            <div className="w-16 h-1 bg-accent mt-2 rounded-full" />
          </motion.div>
 
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left Box: CitasYA support */}
            <motion.div 
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-surface-card/60 border border-line rounded-3xl p-8 flex flex-col gap-5 hover:border-line-strong transicion"
            >
              <span className="text-4xl">💻</span>
              <h3 className="text-2xl font-serif font-normal">Soporte Técnico de la Página</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Si experimentas problemas técnicos con el funcionamiento de CitasYA, como errores al iniciar sesión, problemas al agendar o fallas en el visualizador, por favor contacta a nuestro equipo de desarrollo:
              </p>
              <div className="bg-surface-muted p-4 rounded-xl border border-line flex flex-col gap-1.5 hover:border-accent/30 transicion">
                <span className="text-xs text-white/60 uppercase tracking-widest">Correo de soporte</span>
                <a href="mailto:soporte@citasya.com" className="inline-flex items-center min-h-11 text-base font-bold text-accent hover:text-accent-hover underline-offset-4 hover:underline break-all">
                  soporte@citasya.com
                </a>
              </div>
            </motion.div>
 
            {/* Right Box: EPS support */}
            <motion.div 
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-surface-card/60 border border-line rounded-3xl p-8 flex flex-col gap-5 hover:border-line-strong transicion"
            >
              <span className="text-4xl">🏥</span>
              <h3 className="text-2xl font-serif font-normal">Asuntos de tu EPS</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Si tu consulta está relacionada con autorizaciones de servicios, reclamos, entrega de medicamentos o peticiones directamente relacionadas con tu EPS, comunícate a sus canales oficiales:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="bg-surface-muted p-3 rounded-xl border border-line hover:border-accent/30 transicion">
                  <p className="text-sm font-semibold text-white">Sanitas</p>
                  <a href="mailto:contacto@epssanitas.com" className="inline-flex items-center min-h-11 text-xs text-accent hover:text-accent-hover underline-offset-4 hover:underline break-all">
                    contacto@epssanitas.com
                  </a>
                </div>
                <div className="bg-surface-muted p-3 rounded-xl border border-line hover:border-accent/30 transicion">
                  <p className="text-sm font-semibold text-white">Sura</p>
                  <a href="mailto:afiliados@epssura.com.co" className="inline-flex items-center min-h-11 text-xs text-accent hover:text-accent-hover underline-offset-4 hover:underline break-all">
                    afiliados@epssura.com.co
                  </a>
                </div>
                <div className="bg-surface-muted p-3 rounded-xl border border-line hover:border-accent/30 transicion">
                  <p className="text-sm font-semibold text-white">Compensar</p>
                  <a href="mailto:servicioalcliente@compensarsalud.com" className="inline-flex items-center min-h-11 text-xs text-accent hover:text-accent-hover underline-offset-4 hover:underline break-all">
                    servicioalcliente@compensarsalud.com
                  </a>
                </div>
                <div className="bg-surface-muted p-3 rounded-xl border border-line hover:border-accent/30 transicion">
                  <p className="text-sm font-semibold text-white">Salud Total</p>
                  <a href="mailto:defensoria@saludtotal.com.co" className="inline-flex items-center min-h-11 text-xs text-accent hover:text-accent-hover underline-offset-4 hover:underline break-all">
                    defensoria@saludtotal.com.co
                  </a>
                </div>
                <div className="bg-surface-muted p-3 rounded-xl border border-line hover:border-accent/30 transicion">
                  <p className="text-sm font-semibold text-white">Famisanar</p>
                  <a href="mailto:servicioalcliente@famisanar.com.co" className="inline-flex items-center min-h-11 text-xs text-accent hover:text-accent-hover underline-offset-4 hover:underline break-all">
                    servicioalcliente@famisanar.com.co
                  </a>
                </div>
                <div className="bg-surface-muted p-3 rounded-xl border border-line hover:border-accent/30 transicion">
                  <p className="text-sm font-semibold text-white">Coosalud</p>
                  <a href="mailto:defensordelusuario@coosalud.com" className="inline-flex items-center min-h-11 text-xs text-accent hover:text-accent-hover underline-offset-4 hover:underline break-all">
                    defensordelusuario@coosalud.com
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="relative z-20">
        <Footer />
      </div>

    </div>
    </MotionConfig>
  );
}
