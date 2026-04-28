import type { AppointmentMode } from '@/types/database';
import { APPOINTMENT_MODE_LABELS } from '@/lib/constants';

interface ToggleProps {
  readonly value: AppointmentMode;
  readonly onChange: (mode: AppointmentMode) => void;
}

const MODES: readonly AppointmentMode[] = ['presencial', 'telemedicina'];

const MODE_ICONS: Record<AppointmentMode, string> = {
  presencial: '🏥',
  telemedicina: '💻',
};

export function Toggle({ value, onChange }: ToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Modalidad de atención"
      className="inline-flex items-center bg-primary-100 rounded-full p-1 gap-1"
    >
      {MODES.map((mode) => {
        const isSelected = value === mode;

        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(mode)}
            className={`
              inline-flex items-center gap-2 px-5 py-2.5
              rounded-full text-sm font-semibold
              transition-all duration-200 ease-out
              cursor-pointer
              ${
                isSelected
                  ? 'bg-surface-card text-primary-800 shadow-card'
                  : 'text-text-muted hover:text-primary-700'
              }
            `}
          >
            <span aria-hidden="true">{MODE_ICONS[mode]}</span>
            {APPOINTMENT_MODE_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}
