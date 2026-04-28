-- ============================================================================
-- CitasYA — Migration 002: Row Level Security (RLS)
-- Políticas de seguridad por tabla
-- ============================================================================

-- ─── Habilitar RLS en todas las tablas ──────────────────────────────────────

ALTER TABLE public.eps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ─── EPS: Lectura pública, escritura solo admins ────────────────────────────

CREATE POLICY "eps_read_public"
  ON public.eps FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "eps_admin_all"
  ON public.eps FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ─── Especialidades: Lectura pública, escritura solo admins ─────────────────

CREATE POLICY "specialties_read_public"
  ON public.specialties FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "specialties_admin_all"
  ON public.specialties FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ─── Perfiles: Solo leer/editar el propio ───────────────────────────────────

CREATE POLICY "profiles_read_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_read_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ─── Médicos: Lectura pública ───────────────────────────────────────────────

CREATE POLICY "doctors_read_public"
  ON public.doctors FOR SELECT
  TO authenticated, anon
  USING (active = true);

CREATE POLICY "doctors_admin_all"
  ON public.doctors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ─── Disponibilidad: Lectura pública ────────────────────────────────────────

CREATE POLICY "availability_read_public"
  ON public.availability_slots FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "availability_admin_all"
  ON public.availability_slots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ─── Citas: Solo ver/editar las propias ─────────────────────────────────────

CREATE POLICY "appointments_read_own"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "appointments_insert_own"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "appointments_update_own"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "appointments_admin_all"
  ON public.appointments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ─── Notificaciones: Solo ver las propias (vía citas) ───────────────────────

CREATE POLICY "notifications_read_own"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = notifications.appointment_id
        AND appointments.patient_id = auth.uid()
    )
  );

CREATE POLICY "notifications_admin_all"
  ON public.notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
