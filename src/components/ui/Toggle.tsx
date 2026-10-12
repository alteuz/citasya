import type { AppointmentMode } from '@/types/database';
import { APPOINTMENT_MODE_LABELS } from '@/lib/constants';
import { createElement } from 'react';
import { Building2, Video, type LucideIcon } from 'lucide-react';

interface ToggleProps {
  readonly value: AppointmentMode;
  readonly onChange: (mode: AppointmentMode) => void;
}

const MODES: readonly AppointmentMode[] = ['presencial', 'telemedicina'];

const MODE_ICONS: Record<AppointmentMode, LucideIcon> = {
  presencial: Building2,
  telemedicina: Video,
};

export function Toggle({ value, onChange }: ToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Modalidad de atención"
      className="inline-flex items-center bg-surface-muted border border-line rounded-full p-1 gap-1"
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
              inline-flex items-center gap-2 min-h-11 px-5 py-2.5
              rounded-full text-sm font-semibold
              presionable cursor-pointer
              ${
                isSelected
                  ? 'bg-brand text-white shadow-button'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
              }
            `}
          >
            {createElement(MODE_ICONS[mode], { size: 16, 'aria-hidden': true })}
            {APPOINTMENT_MODE_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}
