import { useEffect, useRef } from 'react';

/**
 * Lleva la vista al inicio del contenido y pasa el foco allí (H-53, H-55).
 *
 * Una SPA no recarga la página: sin esto, al cambiar de vista o de paso la
 * pantalla conserva el desplazamiento anterior (el título queda arriba, fuera
 * de la vista) y un lector de pantalla no anuncia nada. El foco va al título
 * de la vista si ya existe, o al contenido principal mientras carga.
 */
export function llevarAlInicio(): void {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  const contenido = document.getElementById('main-content');
  const titulo = contenido?.querySelector<HTMLElement>('h1');
  const destino = titulo ?? contenido;
  if (!destino) return;
  // Un título no recibe foco por sí mismo: -1 lo permite sin sumarlo al orden del tabulador.
  if (!destino.hasAttribute('tabindex')) destino.setAttribute('tabindex', '-1');
  destino.focus({ preventScroll: true });
}

/**
 * Cuando cambia el paso de un flujo (elegir horario → confirmar → cita
 * agendada), la persona ve el resultado desde arriba. No actúa al montar:
 * la llegada a la página la maneja el cambio de ruta (RootLayout).
 */
export function useLlevarAlInicio(paso: string): void {
  const pasoAnterior = useRef(paso);

  useEffect(() => {
    if (pasoAnterior.current === paso) return;
    pasoAnterior.current = paso;
    llevarAlInicio();
  }, [paso]);
}
