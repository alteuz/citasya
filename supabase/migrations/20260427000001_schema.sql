-- ============================================================================
-- CitasYA — Migration 001: Schema completo
-- Tablas: eps, specialties, profiles, doctors, availability_slots,
--         appointments, notifications
-- ============================================================================

-- ─── EPS ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.eps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  nit TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.eps IS 'Entidades Promotoras de Salud vinculadas a la plataforma';

-- ─── Especialidades ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.specialties IS 'Especialidades médicas disponibles';

-- ─── Perfiles de usuario ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cedula TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'admin')),
  eps_id UUID REFERENCES public.eps(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Perfiles extendidos de usuarios (pacientes y admins)';

-- ─── Médicos ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE RESTRICT,
  eps_id UUID NOT NULL REFERENCES public.eps(id) ON DELETE RESTRICT,
  license_number TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.doctors IS 'Médicos registrados (simulados en fase 1)';

-- ─── Disponibilidad ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un médico no puede tener dos slots con el mismo inicio el mismo día
  CONSTRAINT unique_doctor_slot UNIQUE (doctor_id, date, start_time),
  -- El horario de fin debe ser posterior al de inicio
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

COMMENT ON TABLE public.availability_slots IS 'Slots de disponibilidad de médicos';

-- ─── Citas ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  slot_id UUID NOT NULL REFERENCES public.availability_slots(id) ON DELETE RESTRICT,
  eps_id UUID NOT NULL REFERENCES public.eps(id) ON DELETE RESTRICT,
  specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  mode TEXT NOT NULL DEFAULT 'presencial' CHECK (mode IN ('presencial', 'telemedicina')),
  notes TEXT,
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Un slot solo puede tener una cita activa
  CONSTRAINT unique_active_slot UNIQUE (slot_id)
);

COMMENT ON TABLE public.appointments IS 'Citas médicas agendadas por pacientes';

-- ─── Notificaciones (log) ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('confirmation', 'reminder', 'cancellation')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending'))
);

COMMENT ON TABLE public.notifications IS 'Log de notificaciones enviadas';

-- ─── Índices para rendimiento ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_eps ON public.profiles(eps_id);
CREATE INDEX IF NOT EXISTS idx_profiles_cedula ON public.profiles(cedula);
CREATE INDEX IF NOT EXISTS idx_doctors_specialty ON public.doctors(specialty_id);
CREATE INDEX IF NOT EXISTS idx_doctors_eps ON public.doctors(eps_id);
CREATE INDEX IF NOT EXISTS idx_availability_doctor_date ON public.availability_slots(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_availability_date_booked ON public.availability_slots(date, is_booked);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_appointment ON public.notifications(appointment_id);
