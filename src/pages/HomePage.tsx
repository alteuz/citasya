import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { STATS, HOW_IT_WORKS_STEPS } from '@/lib/constants';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="bg-primary-950 text-white min-h-screen animate-fade-in font-sans">
      {/* ─── HERO SECTION ─── */}
      <section className="pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden relative">
        {/* Decorative background glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-accent-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Text & CTA */}
            <div className="flex flex-col items-start text-left z-10">
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[5rem] font-bold tracking-tight leading-[1.1] mb-6 text-white">
                Tu Salud,
                <br />
                <span className="text-primary-100 font-light">Reimaginada</span>
              </h1>
              
              <p className="text-lg md:text-xl text-primary-200 max-w-lg mb-10 leading-relaxed font-light">
                Agendamiento inteligente: Detección temprana, cuidado avanzado y soluciones personalizadas para un futuro más saludable.
              </p>

              <div className="flex items-center gap-4 mb-16">
                <Button 
                  variant="accent" 
                  size="lg" 
                  className="rounded-full px-8 py-4 text-primary-950 font-bold shadow-[0_0_20px_rgba(45,212,191,0.3)] hover:shadow-[0_0_25px_rgba(45,212,191,0.5)] transition-all"
                  onClick={() => navigate('/buscar')}
                >
                  Agendar Cita
                </Button>
                
                <button 
                  className="w-14 h-14 rounded-full border border-primary-400 flex items-center justify-center text-primary-200 hover:bg-primary-800 hover:text-white transition-colors cursor-pointer group"
                  aria-label="Ver video explicativo"
                  onClick={() => {
                    const el = document.getElementById('como-funciona');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <svg className="w-5 h-5 ml-1 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>

              {/* Floating Doctor Card (Reference match) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 max-w-lg w-full relative shadow-2xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-bl-full -z-10 transition-colors group-hover:bg-accent-50" />
                <div className="flex-1 text-center sm:text-left z-10">
                  <p className="text-sm font-bold text-primary-950 mb-2">Cuidado Inteligente</p>
                  <h3 className="text-2xl font-bold text-primary-900 leading-tight mb-6">
                    Mantente un paso adelante con CitasYA
                  </h3>
                  <div className="flex items-center justify-between border-t border-primary-100 pt-4 mt-2">
                    <div className="text-left">
                      <p className="font-bold text-primary-950 text-sm">Dr. Alejandro Gómez</p>
                      <p className="text-xs text-text-muted">Especialista general</p>
                    </div>
                    <button className="text-xs font-bold text-accent-600 hover:text-accent-700 uppercase tracking-wider">
                      Conectar
                    </button>
                  </div>
                </div>
                {/* Doctor Image Placeholder / Avatar */}
                <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-2xl bg-primary-100 overflow-hidden relative shadow-inner">
                   <div className="absolute inset-0 bg-gradient-to-tr from-primary-200 to-primary-100 flex items-center justify-center">
                     <span className="text-4xl">👨‍⚕️</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Art / Visual */}
            <div className="relative h-[400px] lg:h-[600px] w-full max-w-md mx-auto lg:max-w-none lg:mx-0 rounded-[2.5rem] bg-gradient-to-b from-primary-800 to-primary-900 border border-primary-700/50 shadow-2xl overflow-hidden flex flex-col items-center justify-center p-8 group hover:border-primary-600/50 transition-colors duration-500 mt-8 lg:mt-0">
               {/* Shine effect */}
               <div className="absolute top-0 left-1/4 w-full h-1/2 bg-white/5 blur-[100px] -rotate-45 pointer-events-none" />
               
               <div className="absolute top-10 w-full px-10 flex justify-between items-start">
                 <span className="text-2xl font-bold text-white tracking-widest opacity-90">BASE MÉDICA</span>
               </div>
               
               {/* 3D Object Placeholder (Using the logo or an icon as the central shiny element) */}
               <div className="relative z-10 transform group-hover:scale-105 transition-transform duration-700 ease-out flex items-center justify-center w-full h-full">
                  {/* Glowing background behind logo */}
                  <div className="absolute inset-0 bg-accent-400/20 blur-[80px] rounded-full scale-75" />
                  <img 
                    src="/logo.png" 
                    alt="CitasYA Logo 3D" 
                    className="w-1/2 lg:w-3/4 max-w-[200px] lg:max-w-[300px] drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] object-contain filter brightness-110"
                  />
               </div>

               <div className="absolute bottom-10 right-10">
                 <p className="text-sm text-primary-200 font-light">
                   Desde <span className="font-bold text-white">2026</span> innovando en salud
                 </p>
               </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── STATS SECTION ─── */}
      <section className="py-12 md:py-16 bg-primary-900 border-y border-primary-800/50" aria-label="Estadísticas">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-0 sm:divide-x divide-primary-700/50">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center px-4">
                <p className="text-4xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-sm text-primary-300 font-medium uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section
        id="como-funciona"
        className="py-20 md:py-32 bg-primary-950"
        aria-labelledby="how-it-works-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 md:mb-24">
            <Badge variant="accent" className="mb-6 bg-primary-800/50 text-accent-300 border border-primary-700">Proceso simple</Badge>
            <h2
              id="how-it-works-heading"
              className="text-4xl md:text-5xl font-bold text-white mb-6"
            >
              ¿Cómo funciona?
            </h2>
            <p className="text-xl text-primary-200 max-w-2xl mx-auto font-light">
              Agenda tu cita en 3 simples pasos, sin filas ni llamadas telefónicas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <div
                key={step.step}
                className="
                  relative bg-primary-900/40 rounded-3xl p-10
                  border border-primary-800/50 backdrop-blur-sm
                  hover:bg-primary-800/60 hover:border-primary-600/50 hover:-translate-y-2
                  transition-all duration-500 ease-out
                  text-center group
                "
              >
                {/* Connector line between cards on desktop */}
                {index !== 2 && (
                   <div className="hidden md:block absolute top-1/2 -right-8 w-8 h-px bg-gradient-to-r from-primary-600 to-transparent z-0" />
                )}

                {/* Step number */}
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-700 to-primary-800 border border-primary-600 flex items-center justify-center text-white text-xl font-bold mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500">
                  {step.step}
                </div>

                {/* Icon */}
                <div className="text-5xl mb-6 text-accent-400 opacity-90 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                  {step.icon}
                </div>

                <h3 className="text-xl font-bold text-white mb-4">
                  {step.title}
                </h3>
                <p className="text-base text-primary-200 leading-relaxed font-light">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="py-24 bg-gradient-to-b from-primary-950 to-primary-900 border-t border-primary-800/50" aria-label="Llamado a la acción">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center bg-primary-800/30 rounded-[3rem] p-12 border border-primary-700/50 backdrop-blur-md shadow-2xl">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Tu salud no puede esperar
          </h2>
          <p className="text-xl text-primary-200 mb-10 max-w-2xl mx-auto font-light">
            Únete a miles de colombianos que ya gestionan sus citas médicas de forma digital, rápida y segura.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button 
              variant="accent" 
              size="lg" 
              className="rounded-full px-10 py-4 text-primary-950 font-bold shadow-[0_0_20px_rgba(45,212,191,0.2)] hover:shadow-[0_0_25px_rgba(45,212,191,0.4)] transition-all w-full sm:w-auto"
              onClick={() => navigate('/registrarse')}
            >
              Crear cuenta gratis
              <span aria-hidden="true" className="ml-2">→</span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
