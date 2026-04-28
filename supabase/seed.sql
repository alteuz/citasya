-- ============================================================================
-- CitasYA — Seed Data (datos simulados para demo y testing)
-- ============================================================================

-- ─── EPS de Bogotá ──────────────────────────────────────────────────────────

INSERT INTO public.eps (id, name, nit, phone, email, address) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Sura EPS', '800088702-2', '(601) 423-4400', 'contacto@sura.com.co', 'Carrera 43A # 1-50, Bogotá'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Nueva EPS', '900156264-2', '(601) 307-9999', 'contacto@nuevaeps.com.co', 'Calle 63 # 9-85, Bogotá'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Sanitas', '800251440-6', '(601) 375-0000', 'contacto@sanitas.com.co', 'Autopista Norte # 108-27, Bogotá'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Compensar', '860066942-7', '(601) 428-8888', 'contacto@compensar.com', 'Avenida 68 # 49A-47, Bogotá'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'Famisanar', '830003564-7', '(601) 307-8888', 'contacto@famisanar.com.co', 'Calle 26 # 69-63, Bogotá'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'Salud Total', '800130907-4', '(601) 319-0000', 'contacto@saludtotal.com.co', 'Carrera 7 # 32-33, Bogotá'),
  ('a1b2c3d4-0007-4000-8000-000000000007', 'Coomeva EPS', '805000427-1', '(601) 423-0000', 'contacto@coomeva.com.co', 'Calle 100 # 11B-27, Bogotá'),
  ('a1b2c3d4-0008-4000-8000-000000000008', 'Medimás', '900914254-3', '(601) 423-7070', 'contacto@medimas.com.co', 'Carrera 13 # 27-00, Bogotá')
ON CONFLICT (id) DO NOTHING;

-- ─── Especialidades ─────────────────────────────────────────────────────────

INSERT INTO public.specialties (id, name, description) VALUES
  ('b2c3d4e5-0001-4000-8000-000000000001', 'Medicina General', 'Atención primaria y consultas generales de salud'),
  ('b2c3d4e5-0002-4000-8000-000000000002', 'Cardiología', 'Diagnóstico y tratamiento de enfermedades del corazón'),
  ('b2c3d4e5-0003-4000-8000-000000000003', 'Pediatría', 'Atención médica especializada para niños y adolescentes'),
  ('b2c3d4e5-0004-4000-8000-000000000004', 'Ginecología', 'Salud reproductiva y atención integral de la mujer'),
  ('b2c3d4e5-0005-4000-8000-000000000005', 'Psicología', 'Salud mental, terapia y bienestar emocional'),
  ('b2c3d4e5-0006-4000-8000-000000000006', 'Dermatología', 'Diagnóstico y tratamiento de enfermedades de la piel'),
  ('b2c3d4e5-0007-4000-8000-000000000007', 'Ortopedia', 'Tratamiento de lesiones y enfermedades del sistema musculoesquelético'),
  ('b2c3d4e5-0008-4000-8000-000000000008', 'Oftalmología', 'Atención especializada en salud visual')
ON CONFLICT (id) DO NOTHING;

-- ─── Médicos simulados ──────────────────────────────────────────────────────

INSERT INTO public.doctors (id, full_name, specialty_id, eps_id, license_number, phone, email) VALUES
  -- Medicina General
  ('c3d4e5f6-0001-4000-8000-000000000001', 'Dra. María Alejandra Rodríguez', 'b2c3d4e5-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'MED-2019-0001', '310-555-0001', 'maria.rodriguez@citasya.co'),
  ('c3d4e5f6-0002-4000-8000-000000000002', 'Dr. Carlos Andrés Gómez', 'b2c3d4e5-0001-4000-8000-000000000001', 'a1b2c3d4-0002-4000-8000-000000000002', 'MED-2018-0002', '311-555-0002', 'carlos.gomez@citasya.co'),
  ('c3d4e5f6-0003-4000-8000-000000000003', 'Dra. Laura Valentina Díaz', 'b2c3d4e5-0001-4000-8000-000000000001', 'a1b2c3d4-0003-4000-8000-000000000003', 'MED-2020-0003', '312-555-0003', 'laura.diaz@citasya.co'),

  -- Cardiología
  ('c3d4e5f6-0004-4000-8000-000000000004', 'Dr. Andrés Felipe Martínez', 'b2c3d4e5-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', 'MED-2015-0004', '313-555-0004', 'andres.martinez@citasya.co'),
  ('c3d4e5f6-0005-4000-8000-000000000005', 'Dra. Sofía Hernández', 'b2c3d4e5-0002-4000-8000-000000000002', 'a1b2c3d4-0004-4000-8000-000000000004', 'MED-2016-0005', '314-555-0005', 'sofia.hernandez@citasya.co'),

  -- Pediatría
  ('c3d4e5f6-0006-4000-8000-000000000006', 'Dr. Juan Pablo López', 'b2c3d4e5-0003-4000-8000-000000000003', 'a1b2c3d4-0002-4000-8000-000000000002', 'MED-2017-0006', '315-555-0006', 'juan.lopez@citasya.co'),
  ('c3d4e5f6-0007-4000-8000-000000000007', 'Dra. Camila Andrea Torres', 'b2c3d4e5-0003-4000-8000-000000000003', 'a1b2c3d4-0005-4000-8000-000000000005', 'MED-2019-0007', '316-555-0007', 'camila.torres@citasya.co'),

  -- Ginecología
  ('c3d4e5f6-0008-4000-8000-000000000008', 'Dra. Valentina Restrepo', 'b2c3d4e5-0004-4000-8000-000000000004', 'a1b2c3d4-0003-4000-8000-000000000003', 'MED-2016-0008', '317-555-0008', 'valentina.restrepo@citasya.co'),

  -- Psicología
  ('c3d4e5f6-0009-4000-8000-000000000009', 'Dr. Santiago Morales', 'b2c3d4e5-0005-4000-8000-000000000005', 'a1b2c3d4-0001-4000-8000-000000000001', 'MED-2018-0009', '318-555-0009', 'santiago.morales@citasya.co'),
  ('c3d4e5f6-0010-4000-8000-000000000010', 'Dra. Isabella Vargas', 'b2c3d4e5-0005-4000-8000-000000000005', 'a1b2c3d4-0006-4000-8000-000000000006', 'MED-2020-0010', '319-555-0010', 'isabella.vargas@citasya.co'),

  -- Dermatología
  ('c3d4e5f6-0011-4000-8000-000000000011', 'Dr. Sebastián Castro', 'b2c3d4e5-0006-4000-8000-000000000006', 'a1b2c3d4-0004-4000-8000-000000000004', 'MED-2017-0011', '320-555-0011', 'sebastian.castro@citasya.co'),

  -- Ortopedia
  ('c3d4e5f6-0012-4000-8000-000000000012', 'Dra. Daniela Ruiz', 'b2c3d4e5-0007-4000-8000-000000000007', 'a1b2c3d4-0007-4000-8000-000000000007', 'MED-2015-0012', '321-555-0012', 'daniela.ruiz@citasya.co'),

  -- Oftalmología
  ('c3d4e5f6-0013-4000-8000-000000000013', 'Dr. Mateo Jiménez', 'b2c3d4e5-0008-4000-8000-000000000008', 'a1b2c3d4-0008-4000-8000-000000000008', 'MED-2019-0013', '322-555-0013', 'mateo.jimenez@citasya.co')
ON CONFLICT (id) DO NOTHING;

-- ─── Disponibilidad: slots para los próximos 14 días ────────────────────────
-- Generamos slots de 30 minutos entre 7:00 y 17:00 para cada médico

DO $$
DECLARE
  doc RECORD;
  d DATE;
  h INTEGER;
  slot_start TIME;
  slot_end TIME;
BEGIN
  FOR doc IN SELECT id FROM public.doctors WHERE active = true LOOP
    FOR d IN SELECT generate_series(CURRENT_DATE + 1, CURRENT_DATE + 14, '1 day'::interval)::date LOOP
      -- Solo días de semana (1=lunes ... 5=viernes)
      IF EXTRACT(DOW FROM d) BETWEEN 1 AND 5 THEN
        FOR h IN 7..16 LOOP
          -- Slot :00 - :30
          slot_start := (h || ':00')::TIME;
          slot_end := (h || ':30')::TIME;
          INSERT INTO public.availability_slots (doctor_id, date, start_time, end_time, is_booked)
          VALUES (doc.id, d, slot_start, slot_end, false)
          ON CONFLICT (doctor_id, date, start_time) DO NOTHING;

          -- Slot :30 - :00 (siguiente hora)
          slot_start := (h || ':30')::TIME;
          slot_end := ((h + 1) || ':00')::TIME;
          INSERT INTO public.availability_slots (doctor_id, date, start_time, end_time, is_booked)
          VALUES (doc.id, d, slot_start, slot_end, false)
          ON CONFLICT (doctor_id, date, start_time) DO NOTHING;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;
