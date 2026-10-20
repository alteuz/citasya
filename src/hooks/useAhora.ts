import { useEffect, useState } from 'react';

/**
 * Hora actual, actualizada cada minuto. Permite que una cita pase de
 * «próximas» al historial cuando termina, sin recargar la página (H-36), y
 * mantiene el render puro: la hora se lee una vez y vive en el estado.
 */
export function useAhora(intervaloMs = 60_000): Date {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);

  return ahora;
}
