-- Fix RLS infinite recursion
-- The previous admin RLS policies used EXISTS (SELECT 1 FROM profiles ... ) which caused infinite recursion
-- when the target table was profiles itself, or when accessing any table that in turn checked admin rights.
-- We solve this by creating a SECURITY DEFINER function to bypass RLS when checking roles.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Replace eps admin policy
DROP POLICY IF EXISTS "eps_admin_all" ON public.eps;
CREATE POLICY "eps_admin_all" ON public.eps FOR ALL TO authenticated USING (public.is_admin());

-- Replace specialties admin policy
DROP POLICY IF EXISTS "specialties_admin_all" ON public.specialties;
CREATE POLICY "specialties_admin_all" ON public.specialties FOR ALL TO authenticated USING (public.is_admin());

-- Replace profiles admin policy
DROP POLICY IF EXISTS "profiles_admin_read_all" ON public.profiles;
CREATE POLICY "profiles_admin_read_all" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());

-- Replace doctors admin policy
DROP POLICY IF EXISTS "doctors_admin_all" ON public.doctors;
CREATE POLICY "doctors_admin_all" ON public.doctors FOR ALL TO authenticated USING (public.is_admin());

-- Replace availability slots admin policy
DROP POLICY IF EXISTS "availability_admin_all" ON public.availability_slots;
CREATE POLICY "availability_admin_all" ON public.availability_slots FOR ALL TO authenticated USING (public.is_admin());

-- Replace appointments admin policy
DROP POLICY IF EXISTS "appointments_admin_all" ON public.appointments;
CREATE POLICY "appointments_admin_all" ON public.appointments FOR ALL TO authenticated USING (public.is_admin());

-- Replace notifications admin policy
DROP POLICY IF EXISTS "notifications_admin_all" ON public.notifications;
CREATE POLICY "notifications_admin_all" ON public.notifications FOR ALL TO authenticated USING (public.is_admin());
