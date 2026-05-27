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
    <span className={`font-serif text-[28px] tracking-tight font-normal ${dark ? 'text-primary-950' : 'text-white'}`}>
      Citas<span className="text-[#00C9A7]">YA</span>
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
        className="fixed inset-0 w-full h-full object-cover z-[1] pointer-events-none"
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
        className="fixed inset-0 z-[2] pointer-events-none" 
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.7) 80%, rgba(0,0,0,0.92) 100%)'
        }}
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
              className="nav-link-underline text-[13px] font-semibold tracking-widest uppercase text-white/80 hover:text-[#00C9A7] transition-colors cursor-pointer"
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
                    className="text-[13px] font-semibold tracking-widest uppercase text-white/80 hover:text-[#00C9A7] transition-colors cursor-pointer nav-link-underline"
                  >
                    Mi Panel
                  </motion.button>
                  <motion.button
                    variants={fadeDown(7)}
                    initial="initial"
                    animate="animate"
                    onClick={() => void logout()}
                    className="text-[13px] font-semibold tracking-widest uppercase text-red-400 hover:text-red-300 transition-colors cursor-pointer"
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
                    className="text-[13px] font-semibold tracking-widest uppercase text-white/80 hover:text-[#00C9A7] transition-colors cursor-pointer nav-link-underline"
                  >
                    Iniciar Sesión
                  </motion.button>
                  <motion.button
                    variants={fadeDown(7)}
                    initial="initial"
                    animate="animate"
                    onClick={() => navigate('/registrarse')}
                    className="bg-[#00C9A7] hover:bg-[#00bda0] text-primary-950 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-105 cursor-pointer shadow-[0_0_15px_rgba(0,201,167,0.2)]"
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
            className="w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white/25 transition-colors"
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
      <div className="relative z-20 flex-1 flex items-center justify-end px-5 sm:px-8 md:px-8 gap-8 md:gap-10 mt-16 md:mt-0">
        {/* Stat 1 */}
        <motion.div 
          variants={fadeUp(2)} 
          initial="initial" 
          animate="animate" 
          whileHover={{ scale: 1.08, y: -4 }}
          className="text-right cursor-default select-none"
        >
          <div className="font-sans font-semibold text-white leading-none tracking-tight" style={{ fontSize: 'clamp(1.6rem, 5vw, 3.5rem)' }}>
            <span className="text-[#00C9A7] text-[0.5em] align-super font-semibold">+</span >50
          </div>
          <div className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-white/55 whitespace-pre-line leading-tight mt-2.5">
            {"EPS\nDISPONIBLES"}
          </div>
        </motion.div>

        {/* Stat 2 */}
        <motion.div 
          variants={fadeUp(3)} 
          initial="initial" 
          animate="animate" 
          whileHover={{ scale: 1.08, y: -4 }}
          className="text-right cursor-default select-none"
        >
          <div className="font-sans font-semibold text-white leading-none tracking-tight" style={{ fontSize: 'clamp(1.6rem, 5vw, 3.5rem)' }}>
            <span className="text-[#00C9A7] text-[0.5em] align-super font-semibold">+</span >200
          </div>
          <div className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-white/55 whitespace-pre-line leading-tight mt-2.5">
            {"ESPECIALIDADES\nMÉDICAS"}
          </div>
        </motion.div>

        {/* Stat 3 */}
        <motion.div 
          variants={fadeUp(4)} 
          initial="initial" 
          animate="animate" 
          whileHover={{ scale: 1.08, y: -4 }}
          className="text-right cursor-default select-none"
        >
          <div className="font-sans font-semibold text-white leading-none tracking-tight" style={{ fontSize: 'clamp(1.6rem, 5vw, 3.5rem)' }}>
            <span className="text-[#00C9A7] text-[0.5em] align-super font-semibold">+</span >10K
          </div>
          <div className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-white/55 whitespace-pre-line leading-tight mt-2.5">
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
          <p className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-white/60 leading-normal hover:text-[#00C9A7] hover:translate-x-1.5 transition-all duration-350 cursor-default select-none">
            TU SALUD,<br />SIN FILAS<br />SIN ESPERAS<br />EN BOGOTÁ
          </p>

          {/* Right: CTA Button */}
          <button 
            onClick={() => navigate('/buscar')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <span className="text-base sm:text-xl text-[#00C9A7] font-semibold uppercase tracking-wide group-hover:opacity-85 transition-all duration-300">
              Agendar Cita
            </span>
            <div className="w-[26px] h-[26px] rounded-full border border-[#00C9A7] flex items-center justify-center shrink-0 group-hover:bg-[#00C9A7] group-hover:scale-110 transition-all duration-300">
              <ArrowUpRight size={12} className="text-[#00C9A7] group-hover:text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
            </div>
          </button>
        </motion.div>

        {/* Row B: Description + Main Heading */}
        <div className="flex items-end justify-between gap-3 sm:gap-4">
          {/* Left Description Column */}
          <div className="w-[140px] xs:w-[160px] sm:w-[200px] shrink-0 flex flex-col gap-3">
            {/* Pill Badge */}
            <motion.div 
              variants={fadeUp(3)}
              initial="initial"
              animate="animate"
              className="inline-flex items-center gap-2 bg-[#00C9A7]/12 border border-[#00C9A7]/30 rounded-full px-3.5 py-1.5 w-fit shadow-[0_0_15px_rgba(0,201,167,0.1)]"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00C9A7] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00C9A7]"></span>
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#00C9A7]">
                Disponible 24/7
              </span>
            </motion.div>

            {/* Description Text */}
            <motion.p 
              variants={fadeUp(6)}
              initial="initial"
              animate="animate"
              className="text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase text-white/45 leading-relaxed hover:text-white/70 hover:translate-x-1 transition-all duration-350 cursor-default select-none"
            >
              Plataforma centralizada para gestionar tus citas con tu EPS en Bogotá. Rápido, seguro y accesible.
            </motion.p>
          </div>

          {/* Right Heading Column */}
          <div className="flex flex-col items-end select-none font-serif text-white uppercase text-right leading-[0.92] select-none" style={{ fontSize: 'clamp(2.2rem, 10vw, 9rem)' }}>
            <div className={`p-6 -m-6 transition-all duration-300 ${animationCompleted ? '' : 'overflow-hidden'}`}>
              <motion.div 
                variants={wordSlideUp(0.4)} 
                initial="initial" 
                animate="animate"
                className={`transition-all duration-300 cursor-default inline-block origin-right ${shouldReduceMotion ? '' : 'hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105'}`}
              >
                Agenda
              </motion.div>
            </div>
            <div className={`p-6 -m-6 transition-all duration-300 ${animationCompleted ? '' : 'overflow-hidden'}`}>
              <motion.div 
                variants={wordSlideUp(0.54)} 
                initial="initial" 
                animate="animate" 
                className={`text-[#00C9A7] italic font-normal transition-all duration-300 cursor-default inline-block origin-right ${shouldReduceMotion ? '' : 'hover:drop-shadow-[0_0_25px_rgba(0,201,167,0.7)] hover:scale-105'}`}
              >
                Sin
              </motion.div>
            </div>
            <div className={`p-6 -m-6 transition-all duration-300 ${animationCompleted ? '' : 'overflow-hidden'}`}>
              <motion.div 
                variants={wordSlideUp(0.68)} 
                initial="initial" 
                animate="animate"
                onAnimationComplete={() => setAnimationCompleted(true)}
                className={`transition-all duration-300 cursor-default inline-block origin-right ${shouldReduceMotion ? '' : 'hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105'}`}
              >
                Filas.
              </motion.div>
            </div>
          </div>
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
                className="w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
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
                    className="text-left text-3xl font-semibold tracking-widest uppercase text-white cursor-pointer hover:text-[#00C9A7] transition-colors"
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
                    className="text-left text-3xl font-semibold tracking-widest uppercase text-white cursor-pointer hover:text-[#00C9A7] transition-colors"
                  >
                    Mi Panel
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      void logout();
                    }}
                    className="text-left text-3xl font-semibold tracking-widest uppercase text-red-400 cursor-pointer hover:text-red-300 transition-colors"
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
                    className="text-left text-3xl font-semibold tracking-widest uppercase text-white cursor-pointer hover:text-[#00C9A7] transition-colors"
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate('/registrarse');
                    }}
                    className="text-left text-3xl font-semibold tracking-widest uppercase text-white cursor-pointer hover:text-[#00C9A7] transition-colors"
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
              className="mt-auto pt-8 text-left text-xl font-semibold tracking-wide uppercase text-[#00C9A7] flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity"
            >
              Agendar Cita <span aria-hidden="true">↗</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SECTION: ¿CÓMO FUNCIONA? ─── */}
      <section 
        id="como-funciona" 
        className="relative z-20 py-24 px-5 sm:px-8 md:px-16 lg:px-24 bg-[#0a091f]/95 border-t border-white/10 text-white"
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
            <span className="text-xs font-bold tracking-widest uppercase text-[#00C9A7]">
              ¿Qué es CitasYA?
            </span>
            <h2 className="text-3xl md:text-5xl font-serif font-normal">
              Cómo funciona la plataforma
            </h2>
            <div className="w-16 h-1 bg-[#00C9A7] mt-2 rounded-full" />
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
              whileHover={shouldReduceMotion ? {} : { scale: 1.03, y: -5 }}
              className="bg-[#131233]/40 border border-white/5 rounded-2xl p-6 flex flex-col gap-4 hover:border-[#00C9A7]/30 transition-all duration-300 cursor-default select-none"
            >
              <span className="text-3xl">🔍</span>
              <h3 className="text-xl font-bold font-serif text-white">1. Encuentra tu Especialidad</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Selecciona la especialidad médica que necesitas y tu EPS correspondiente para filtrar las opciones disponibles de forma inmediata.
              </p>
            </motion.div>
            
            <motion.div 
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={shouldReduceMotion ? {} : { scale: 1.03, y: -5 }}
              className="bg-[#131233]/40 border border-white/5 rounded-2xl p-6 flex flex-col gap-4 hover:border-[#00C9A7]/30 transition-all duration-300 cursor-default select-none"
            >
              <span className="text-3xl">📅</span>
              <h3 className="text-xl font-bold font-serif text-white">2. Elige Médico y Horario</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Compara profesionales calificados, revisa sus agendas en tiempo real y escoge el horario que mejor se adapte a tu vida.
              </p>
            </motion.div>
            
            <motion.div 
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              whileHover={shouldReduceMotion ? {} : { scale: 1.03, y: -5 }}
              className="bg-[#131233]/40 border border-white/5 rounded-2xl p-6 flex flex-col gap-4 hover:border-[#00C9A7]/30 transition-all duration-300 cursor-default select-none"
            >
              <span className="text-3xl">✅</span>
              <h3 className="text-xl font-bold font-serif text-white">3. Agenda e Historial</h3>
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
        className="relative z-20 py-24 px-5 sm:px-8 md:px-16 lg:px-24 bg-[#0c0b24]/95 border-t border-white/10 text-white"
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
            <span className="text-xs font-bold tracking-widest uppercase text-[#00C9A7]">
              Soporte Directo
            </span>
            <h2 className="text-3xl md:text-5xl font-serif font-normal">
              Centro de Ayuda
            </h2>
            <div className="w-16 h-1 bg-[#00C9A7] mt-2 rounded-full" />
          </motion.div>
 
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left Box: CitasYA support */}
            <motion.div 
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-[#131233]/40 border border-white/5 rounded-3xl p-8 flex flex-col gap-5 hover:border-white/10 transition-colors duration-300"
            >
              <span className="text-4xl">💻</span>
              <h3 className="text-2xl font-serif font-normal">Soporte Técnico de la Página</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Si experimentas problemas técnicos con el funcionamiento de CitasYA, como errores al iniciar sesión, problemas al agendar o fallas en el visualizador, por favor contacta a nuestro equipo de desarrollo:
              </p>
              <div className="bg-[#0c0a24] p-4 rounded-xl border border-white/5 flex flex-col gap-1.5 hover:border-[#00C9A7]/30 transition-colors duration-300">
                <span className="text-xs text-white/40 uppercase tracking-widest">Correo de soporte</span>
                <a href="mailto:soporte@citasya.com" className="text-base font-bold text-[#00C9A7] hover:underline">
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
              className="bg-[#131233]/40 border border-white/5 rounded-3xl p-8 flex flex-col gap-5 hover:border-white/10 transition-colors duration-300"
            >
              <span className="text-4xl">🏥</span>
              <h3 className="text-2xl font-serif font-normal">Asuntos de tu EPS</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Si tu consulta está relacionada con autorizaciones de servicios, reclamos, entrega de medicamentos o peticiones directamente relacionadas con tu EPS, comunícate a sus canales oficiales:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="bg-[#0c0a24] p-3 rounded-xl border border-white/5 hover:border-[#00C9A7]/30 transition-colors duration-300">
                  <p className="text-xs font-bold text-white font-serif">Sanitas</p>
                  <a href="mailto:contacto@epssanitas.com" className="text-xs text-[#00C9A7] hover:underline">
                    contacto@epssanitas.com
                  </a>
                </div>
                <div className="bg-[#0c0a24] p-3 rounded-xl border border-white/5 hover:border-[#00C9A7]/30 transition-colors duration-300">
                  <p className="text-xs font-bold text-white font-serif">Sura</p>
                  <a href="mailto:afiliados@epssura.com.co" className="text-xs text-[#00C9A7] hover:underline">
                    afiliados@epssura.com.co
                  </a>
                </div>
                <div className="bg-[#0c0a24] p-3 rounded-xl border border-white/5 hover:border-[#00C9A7]/30 transition-colors duration-300">
                  <p className="text-xs font-bold text-white font-serif">Compensar</p>
                  <a href="mailto:servicioalcliente@compensarsalud.com" className="text-xs text-[#00C9A7] hover:underline">
                    servicioalcliente@compensarsalud.com
                  </a>
                </div>
                <div className="bg-[#0c0a24] p-3 rounded-xl border border-white/5 hover:border-[#00C9A7]/30 transition-colors duration-300">
                  <p className="text-xs font-bold text-white font-serif">Salud Total</p>
                  <a href="mailto:defensoria@saludtotal.com.co" className="text-xs text-[#00C9A7] hover:underline">
                    defensoria@saludtotal.com.co
                  </a>
                </div>
                <div className="bg-[#0c0a24] p-3 rounded-xl border border-white/5 hover:border-[#00C9A7]/30 transition-colors duration-300">
                  <p className="text-xs font-bold text-white font-serif">Famisanar</p>
                  <a href="mailto:servicioalcliente@famisanar.com.co" className="text-xs text-[#00C9A7] hover:underline">
                    servicioalcliente@famisanar.com.co
                  </a>
                </div>
                <div className="bg-[#0c0a24] p-3 rounded-xl border border-white/5 hover:border-[#00C9A7]/30 transition-colors duration-300">
                  <p className="text-xs font-bold text-white font-serif">Coosalud</p>
                  <a href="mailto:defensordelusuario@coosalud.com" className="text-xs text-[#00C9A7] hover:underline">
                    defensordelusuario@coosalud.com
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

    </div>
    </MotionConfig>
  );
}
