/**
 * Ondas de luz del tablero de marca: tres trazos en degradado cian → azul que
 * cruzan el ancho de la pantalla. Decorativas (aria-hidden) y estáticas.
 */
export function Ondas({ className = '' }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1440 220"
      preserveAspectRatio="none"
      className={`pointer-events-none block w-full ${className}`}
    >
      <defs>
        <linearGradient id="onda-a" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00e9fc" stopOpacity="0" />
          <stop offset="0.25" stopColor="#00e9fc" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="#1d69fc" stopOpacity="0.7" />
          <stop offset="1" stopColor="#5843fc" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="onda-b" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5843fc" stopOpacity="0" />
          <stop offset="0.45" stopColor="#1d69fc" stopOpacity="0.55" />
          <stop offset="0.85" stopColor="#00e9fc" stopOpacity="0.8" />
          <stop offset="1" stopColor="#00e9fc" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 150 C 240 70, 480 210, 760 130 S 1240 40, 1440 120" fill="none" stroke="url(#onda-a)" strokeWidth="2" />
      <path d="M0 175 C 300 110, 560 230, 860 160 S 1260 90, 1440 150" fill="none" stroke="url(#onda-b)" strokeWidth="1.5" />
      <path d="M0 196 C 260 150, 620 236, 920 186 S 1300 128, 1440 178" fill="none" stroke="url(#onda-a)" strokeOpacity="0.45" strokeWidth="1" />
    </svg>
  );
}
