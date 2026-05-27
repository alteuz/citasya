import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import heroBgVideo from '@/assets/hero-bg.mp4';

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

  // Motion transitions
  const transition = [0.22, 1, 0.36, 1] as const;

  const fadeDown = (index: number) => ({
    initial: { opacity: 0, y: -20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: index * 0.1,
        duration: 0.6,
        ease: transition
      }
    }
  });

  const fadeUp = (index: number) => ({
    initial: { opacity: 0, y: 32 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        delay: index * 0.12,
        duration: 0.6,
        ease: transition
      }
    }
  });

  const wordSlideUp = (delay: number) => ({
    initial: { y: '110%' },
    animate: { 
      y: 0,
      transition: {
        delay,
        duration: 0.7,
        ease: transition
      }
    }
  });

  const navLinks = [
    { label: 'Inicio', path: '/' },
    { label: 'Especialidades', path: '/buscar' },
    { label: 'EPS', path: '/directorio-eps' },
    { label: 'Ayuda', path: '/buscar' }
  ];

  return (
    <div className="relative w-full min-h-screen text-white flex flex-col justify-between overflow-hidden font-sans select-none">
      
      {/* ─── BASE BACKGROUND COLOR LAYER ─── */}
      <div className="absolute inset-0 bg-black -z-30 pointer-events-none" />

      {/* ─── VIDEO BACKGROUND ─── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-contain -z-20 pointer-events-none"
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
        className="absolute inset-0 -z-10 pointer-events-none" 
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
              onClick={() => navigate(link.path)}
              className="nav-link-underline text-[13px] font-semibold tracking-widest uppercase text-white/80 hover:text-[#00C9A7] transition-colors cursor-pointer"
            >
              {link.label}
            </motion.button>
          ))}
        </div>

        {/* Right: Hamburger button */}
        <motion.button
          variants={fadeDown(5)}
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
          <p className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-white/60 leading-normal">
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
              className="text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase text-white/45 leading-relaxed"
            >
              Plataforma centralizada para gestionar tus citas con tu EPS en Bogotá. Rápido, seguro y accesible.
            </motion.p>
          </div>

          {/* Right Heading Column */}
          <div className="flex flex-col items-end select-none font-serif text-white uppercase text-right leading-[0.88] select-none" style={{ fontSize: 'clamp(2.2rem, 10vw, 9rem)' }}>
            <div className="overflow-hidden">
              <motion.div 
                variants={wordSlideUp(0.4)} 
                initial="initial" 
                animate="animate"
                className="hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 transition-all duration-300 cursor-default inline-block origin-right"
              >
                Agenda
              </motion.div>
            </div>
            <div className="overflow-hidden">
              <motion.div 
                variants={wordSlideUp(0.54)} 
                initial="initial" 
                animate="animate" 
                className="text-[#00C9A7] italic font-normal hover:drop-shadow-[0_0_25px_rgba(0,201,167,0.7)] hover:scale-105 transition-all duration-300 cursor-default inline-block origin-right"
              >
                Sin
              </motion.div>
            </div>
            <div className="overflow-hidden">
              <motion.div 
                variants={wordSlideUp(0.68)} 
                initial="initial" 
                animate="animate"
                className="hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 transition-all duration-300 cursor-default inline-block origin-right"
              >
                Filas.
              </motion.div>
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
            className="fixed inset-0 z-50 bg-black flex flex-col p-5 sm:p-8"
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
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate(link.path);
                  }}
                  className="text-left text-3xl font-semibold tracking-widest uppercase text-white cursor-pointer hover:text-[#00C9A7] transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Bottom CTA */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                navigate('/buscar');
              }}
              className="mt-auto text-left text-xl font-semibold tracking-wide uppercase text-[#00C9A7] flex items-center gap-1.5 cursor-pointer hover:opacity-85 transition-opacity"
            >
              Agendar Cita <span aria-hidden="true">↗</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
