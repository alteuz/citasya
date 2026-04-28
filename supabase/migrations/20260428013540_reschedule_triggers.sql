-- ============================================================================
-- CitasYA — Migration 004: Triggers para Reprogramación
-- ============================================================================

-- 1. Actualizar validación de 24 horas para abarcar reprogramaciones
CREATE OR REPLACE FUNCTION public.validate_appointment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_date DATE;
  slot_start TIME;
  appointment_datetime TIMESTAMPTZ;
BEGIN
  -- Validar si se está cancelando o si se está cambiando de slot (reprogramando)
  IF (NEW.status = 'cancelled' AND OLD.status != 'cancelled') OR (NEW.slot_id != OLD.slot_id) THEN
    SELECT date, start_time INTO slot_date, slot_start
    FROM public.availability_slots
    WHERE id = OLD.slot_id;

    appointment_datetime := (slot_date || ' ' || slot_start)::TIMESTAMPTZ;

    IF appointment_datetime - NOW() < INTERVAL '24 hours' THEN
      RAISE EXCEPTION 'No se puede cancelar ni reprogramar una cita con menos de 24 horas de anticipación.';
    END IF;

    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      NEW.cancelled_at := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_appointment_cancellation ON public.appointments;
DROP TRIGGER IF EXISTS before_appointment_change ON public.appointments;
CREATE TRIGGER before_appointment_change
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment_change();

-- 2. Actualizar manejo de slots para liberar y reservar al reprogramar
CREATE OR REPLACE FUNCTION public.sync_slots_on_appointment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caso 1: Cancelación
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.availability_slots
    SET is_booked = false
    WHERE id = NEW.slot_id;
  END IF;

  -- Caso 2: Reprogramación (cambio de slot)
  IF NEW.slot_id != OLD.slot_id AND NEW.status != 'cancelled' THEN
    -- Liberar slot anterior
    UPDATE public.availability_slots
    SET is_booked = false
    WHERE id = OLD.slot_id;

    -- Reservar nuevo slot
    UPDATE public.availability_slots
    SET is_booked = true
    WHERE id = NEW.slot_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_appointment_cancelled ON public.appointments;
DROP TRIGGER IF EXISTS after_appointment_update ON public.appointments;
CREATE TRIGGER after_appointment_update
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_slots_on_appointment_update();
