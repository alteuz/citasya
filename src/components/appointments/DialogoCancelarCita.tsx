/**
 * Diálogo para cancelar una cita (H-48).
 *
 * Reemplaza el cuadro nativo del navegador (window.prompt), cuyo botón
 * «Cancelar» significaba «no cancelar la cita». Aquí cada botón dice lo que
 * hace y un error del servidor se muestra dentro del diálogo, sin `alert`.
 *
 * Usa el <dialog> nativo: el navegador encierra el foco, cierra con Escape y
 * devuelve el foco al botón que lo abrió.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AppointmentsService } from '@/services/appointments.service';
import { instanteBogota } from '@/lib/citas';

/** Lo que se guarda cuando la persona no escribe un motivo (igual que la base de datos). */
const MOTIVO_POR_DEFECTO = 'Cancelado por el paciente';
const LARGO_MAXIMO_MOTIVO = 300;

export interface CitaPorCancelar {
  readonly id: string;
  readonly doctorName: string;
  /** AAAA-MM-DD */
  readonly slotDate: string;
  /** HH:MM o HH:MM:SS, hora de Bogotá */
  readonly slotStartTime: string;
  /** Familiar para quien es la cita; null o ausente si es del titular. */
  readonly familiarNombre?: string | null;
}

interface DialogoCancelarCitaProps {
  /** La cita que se va a cancelar; `null` mantiene el diálogo cerrado. */
  readonly cita: CitaPorCancelar | null;
  readonly onCerrar: () => void;
  /** Se llama cuando el servidor confirmó la cancelación. */
  readonly onCancelada: () => void;
}

export function DialogoCancelarCita({ cita, onCerrar, onCancelada }: DialogoCancelarCitaProps) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const idDetalle = useId();

  // El estado abierto del <dialog> sigue a la prop `cita`.
  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    if (cita && !el.open) {
      // Sin showModal (navegadores muy antiguos y el entorno de pruebas) se abre sin capa modal.
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
      // El foco inicial va a la opción que no cambia nada, no al campo de texto:
      // en el celular evita que el teclado tape la pregunta.
      el.querySelector<HTMLButtonElement>('[data-no-cancelar]')?.focus();
    } else if (!cita && el.open) {
      if (typeof el.close === 'function') el.close();
      else el.removeAttribute('open');
    }
  }, [cita]);

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={idTitulo}
      aria-describedby={idDetalle}
      // Escape y el cierre nativo avisan al padre, que es quien guarda la cita elegida.
      onClose={onCerrar}
      className="tarjeta m-auto w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl p-6 sm:p-8 text-text-primary backdrop:bg-black/65"
    >
      {cita && (
        // La clave reinicia el motivo y el error cada vez que se abre para otra cita.
        <Contenido key={cita.id} cita={cita} idTitulo={idTitulo} idDetalle={idDetalle} onCerrar={onCerrar} onCancelada={onCancelada} />
      )}
    </dialog>
  );
}

interface ContenidoProps {
  readonly cita: CitaPorCancelar;
  readonly idTitulo: string;
  readonly idDetalle: string;
  readonly onCerrar: () => void;
  readonly onCancelada: () => void;
}

function Contenido({ cita, idTitulo, idDetalle, onCerrar, onCancelada }: ContenidoProps) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const idMotivo = useId();

  const confirmar = async (): Promise<void> => {
    setCancelando(true);
    setError(null);
    try {
      const resultado = await AppointmentsService.cancelAppointment(cita.id, motivo.trim() || MOTIVO_POR_DEFECTO);
      if (!resultado.success) {
        setError(resultado.error);
        return;
      }
      onCancelada();
      onCerrar();
    } catch (err) {
      console.error('Error cancelling appointment:', { appointmentId: cita.id, error: err });
      setError('Ocurrió un error inesperado al cancelar la cita.');
    } finally {
      setCancelando(false);
    }
  };

  return (
    <>
      <h2 id={idTitulo} className="font-sans text-xl font-semibold text-text-primary">
        ¿Cancelar esta cita?
      </h2>
      <p id={idDetalle} className="mt-2 text-text-secondary">
        {cita.familiarNombre ? `La cita de ${cita.familiarNombre} con ` : 'Tu cita con '}
        <strong className="font-semibold text-text-primary">{cita.doctorName}</strong>, el {fechaLarga(cita)} a las {horaCorta(cita)}.
        El horario quedará libre para otra persona.
      </p>

      <div className="mt-5 flex flex-col gap-1.5">
        <label htmlFor={idMotivo} className="text-sm font-medium text-text-secondary">
          Motivo (opcional)
        </label>
        <textarea
          id={idMotivo}
          rows={2}
          maxLength={LARGO_MAXIMO_MOTIVO}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          disabled={cancelando}
          className="control-campo resize-none"
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 bg-error-soft border border-error/30 text-error text-sm font-medium px-4 py-3 rounded-xl">
          {error}
        </p>
      )}

      {/* En el celular «No, volver» queda abajo, al alcance del pulgar, y ocupa todo el ancho. */}
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button type="button" variant="secondary" size="md" onClick={onCerrar} disabled={cancelando} data-no-cancelar>
          No, volver
        </Button>
        <Button type="button" variant="danger" size="md" isLoading={cancelando} onClick={() => { void confirmar(); }}>
          Sí, cancelar la cita
        </Button>
      </div>
    </>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fechaLarga(cita: CitaPorCancelar): string {
  return instanteBogota(cita.slotDate, cita.slotStartTime).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Bogota',
  });
}

function horaCorta(cita: CitaPorCancelar): string {
  const [h = '0', m = '00'] = cita.slotStartTime.split(':');
  const hora = parseInt(h, 10);
  const sufijo = hora >= 12 ? 'PM' : 'AM';
  const hora12 = hora > 12 ? hora - 12 : hora === 0 ? 12 : hora;
  return `${hora12}:${m} ${sufijo}`;
}
