-- ============================================================================
-- CitasYA — Migration 003: Triggers y funciones
-- Auto-crear perfil al registrarse, validar cancelación 24h
-- ============================================================================

-- ─── Función: crear perfil automáticamente al registrarse ───────────────────
-- Se ejecuta como trigger AFTER INSERT en auth.users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, cedula, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'cedula', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'patient'
  );
  RETURN NEW;
END;
$$;

-- Trigger en auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─── Función: validar cancelación con 24h de anticipación ───────────────────
-- Se ejecuta BEFORE UPDATE en appointments cuando status cambia a 'cancelled'

CREATE OR REPLACE FUNCTION public.validate_cancellation()
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
  -- Solo validar cuando se cambia a 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    SELECT date, start_time INTO slot_date, slot_start
    FROM public.availability_slots
    WHERE id = NEW.slot_id;

    appointment_datetime := (slot_date || ' ' || slot_start)::TIMESTAMPTZ;

    IF appointment_datetime - NOW() < INTERVAL '24 hours' THEN
      RAISE EXCEPTION 'No se puede cancelar una cita con menos de 24 horas de anticipación.';
    END IF;

    NEW.cancelled_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER before_appointment_cancellation
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_cancellation();

-- ─── Función: marcar slot como reservado al crear cita ──────────────────────

CREATE OR REPLACE FUNCTION public.book_slot_on_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.availability_slots
  SET is_booked = true
  WHERE id = NEW.slot_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER after_appointment_created
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.book_slot_on_appointment();

-- ─── Función: liberar slot al cancelar cita ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.release_slot_on_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.availability_slots
    SET is_booked = false
    WHERE id = NEW.slot_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER after_appointment_cancelled
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.release_slot_on_cancellation();
