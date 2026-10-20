import { UserRound } from 'lucide-react';
import type { Parentesco } from '@/types/database';
import { etiquetaParentesco } from '@/lib/familia';

interface EtiquetaPacienteProps {
  /** Nombre del familiar. Si es null, la cita es del titular y no se muestra nada. */
  readonly nombre: string | null;
  readonly parentesco: Parentesco | null;
}

/** Indica para quién es una cita cuando no es del titular de la cuenta (RF-13). */
export function EtiquetaPaciente({ nombre, parentesco }: EtiquetaPacienteProps) {
  if (!nombre) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent border border-accent/30"
      title={parentesco ? etiquetaParentesco(parentesco) : undefined}
    >
      <UserRound size={13} aria-hidden="true" /> Para: {nombre}
    </span>
  );
}
