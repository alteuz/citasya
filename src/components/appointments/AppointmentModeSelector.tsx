import { APPOINTMENT_MODE_LABELS } from '@/lib/constants';
import type { AppointmentMode } from '@/types/database';

interface AppointmentModeSelectorProps {
  readonly value: AppointmentMode;
  readonly onChange: (mode: AppointmentMode) => void;
  readonly name?: string;
}

const OPTIONS: readonly { readonly value: AppointmentMode; readonly icon: string }[] = [
  { value: 'presencial', icon: '🏥' },
  { value: 'telemedicina', icon: '💻' },
];

/**
 * Selector de modalidad de la cita.
 *
 * Usa radios nativos dentro de un fieldset: el lector de pantalla anuncia el
 * grupo, la opción y su estado ("seleccionado, 1 de 2"), y las flechas del
 * teclado cambian la opción sin JavaScript adicional (WCAG 1.3.1, 2.1.1, 4.1.2).
 * El radio queda visualmente oculto y la tarjeta refleja su estado y su foco.
 */
export function AppointmentModeSelector({ value, onChange, name = 'modalidad' }: AppointmentModeSelectorProps) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-text-secondary mb-2">Modalidad de atención</legend>
      <div className="flex gap-3">
        {OPTIONS.map((option) => (
          <label key={option.value} className="flex-1 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all
                border-primary-200 text-text-secondary hover:border-primary-300
                peer-checked:border-accent-400 peer-checked:bg-accent-400/10 peer-checked:text-accent-600
                peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-400"
            >
              <span aria-hidden="true">{option.icon}</span>
              {APPOINTMENT_MODE_LABELS[option.value]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
