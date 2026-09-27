-- ════════════════════════════════════════════════════════════════════════════
-- Datos de la simulación (ADR-0005). GENERADO por scripts/simulacion/generar-datos.mjs
-- con semilla 20260926. No editar a mano: modificar el generador y regenerar.
-- EPS: MinSalud, EPS vigentes del régimen contributivo y subsidiado – SGSSS (05-jun-2025); habilitación en Bogotá: Decreto 0182 de 2026
-- Sedes: MinSalud — Registro Especial de Prestadores y Sedes de Servicios de Salud (REPS), datos.gov.co c36g-9fc2 (Fecha corte REPS: Mar 12 2026  3:11PM)
-- Tiempos de espera: Circular Externa 038 de 2025, MinSalud (MGTE, Fase I)
-- Médicos: SINTÉTICOS (nombres ficticios, registro con prefijo SIM-). Ley 1581/2012.
-- Resumen: 9 EPS · 32 sedes · 32 vínculos de red · 135 médicos
-- ════════════════════════════════════════════════════════════════════════════

-- ─── EPS habilitadas en Bogotá ───
insert into public.eps (name, nit, codigo_habilitacion, regimen, fuente, fecha_corte, active) values ('Aliansalud EPS', '830113831', 'EPS001', 'contributivo', 'MinSalud, EPS vigentes del régimen contributivo y subsidiado – SGSSS (05-jun-2025); habilitación en Bogotá: Decreto 0182 de 2026', '2025-06-05', true) on conflict (nit) do update set name = excluded.name, codigo_habilitacion = excluded.codigo_habilitacion, regimen = excluded.regimen, fuente = excluded.fuente, fecha_corte = excluded.fecha_corte, active = true;
update public.eps set name = 'Salud Total EPS', nit = '800130907', codigo_habilitacion = 'EPS002', regimen = 'contributivo', fuente = 'MinSalud, EPS vigentes del régimen contributivo y subsidiado – SGSSS (05-jun-2025); habilitación en Bogotá: Decreto 0182 de 2026', fecha_corte = '2025-06-05', active = true where name = 'Salud Total';
update public.eps set name = 'EPS Sanitas', nit = '800251440', codigo_habilitacion = 'EPS005', regimen = 'contributivo', fuente = 'MinSalud, EPS vigentes del régimen contributivo y subsidiado – SGSSS (05-jun-2025); habilitación en Bogotá: Decreto 0182 de 2026', fecha_corte = '2025-06-05', active = true where name = 'Sanitas';
update public.eps set name = 'Compensar EPS', nit = '860066942', codigo_habilitacion = 'EPS008', regimen = 'contributivo', fuente = 'MinSalud, EPS vigentes del régimen contributivo y subsidiado – SGSSS (05-jun-2025); habilitación en Bogotá: Decreto 0182 de 2026', fecha_corte = '2025-06-05', active = true where name = 'Compensar';
update public.eps set name = 'EPS Sura', nit = '800088702', codigo_habilitacion = 'EPS010', regimen = 'contributivo', fuente = 'MinSalud, EPS vigentes del régimen contributivo y subsidiado – SGSSS (05-jun-2025); habilitación en Bogotá: Decreto 0182 de 2026', fecha_corte = '2025-06-05', active = true where name = 'Sura EPS';
update public.eps set name = 'Famisanar EPS', nit = '830003564', codigo_habilitacion = 'EPS017', regimen = 'contributivo', fuente = 'MinSalud, EPS vigentes del régimen contributivo y subsidiado – SGSSS (05-jun-2025); habilitación en Bogotá: Decreto 0182 de 2026', fecha_corte = '2025-06-05', active = true where name = 'Famisanar';
update public.eps set name = 'Nueva EPS', nit = '900156264', codigo_habilitacion = 'EPS037', regimen = 'ambos', fuente = 'MinSalud, EPS vigentes del régimen contributivo y subsidiado – SGSSS (05-jun-2025); habilitación en Bogotá: Decreto 0182 de 2026', fecha_corte = '2025-06-05', active = true where name = 'Nueva EPS';
insert into public.eps (name, nit, codigo_habilitacion, regimen, fuente, fecha_corte, active) values ('Capital Salud EPS-S', '900298372', 'EPSS34', 'subsidiado', 'MinSalud, EPS vigentes del régimen contributivo y subsidiado – SGSSS (05-jun-2025); habilitación en Bogotá: Decreto 0182 de 2026', '2025-06-05', true) on conflict (nit) do update set name = excluded.name, codigo_habilitacion = excluded.codigo_habilitacion, regimen = excluded.regimen, fuente = excluded.fuente, fecha_corte = excluded.fecha_corte, active = true;
insert into public.eps (name, nit, codigo_habilitacion, regimen, fuente, fecha_corte, active) values ('Mallamas EPSI', '837000084', 'EPSI05', 'subsidiado', 'MinSalud, EPS vigentes del régimen contributivo y subsidiado – SGSSS (05-jun-2025); habilitación en Bogotá: Decreto 0182 de 2026', '2025-06-05', true) on conflict (nit) do update set name = excluded.name, codigo_habilitacion = excluded.codigo_habilitacion, regimen = excluded.regimen, fuente = excluded.fuente, fecha_corte = excluded.fecha_corte, active = true;
-- EPS del MVP que ya no operan: se conservan inactivas (hay citas históricas que las referencian).
update public.eps set name = 'Medimás EPS (liquidada)', nit = '901097473', active = false, fuente = 'Dato del MVP; entidad liquidada. NIT corregido: 900914254 corresponde a Salud Mía según MinSalud' where name = 'Medimás';
update public.eps set name = 'Coomeva EPS (liquidada)', active = false, fuente = 'Dato del MVP; entidad liquidada' where name = 'Coomeva EPS';

-- ─── Especialidades y estándar MGTE ───
update public.specialties set dias_max_mgte = 3, fuente_mgte = 'Circular Externa 038 de 2025, MinSalud (MGTE, Fase I)' where name = 'Medicina General';
update public.specialties set dias_max_mgte = 5, fuente_mgte = 'Circular Externa 038 de 2025, MinSalud (MGTE, Fase I)' where name = 'Pediatría';
insert into public.specialties (name, description, dias_max_mgte, fuente_mgte) values ('Obstetricia', '', 8, 'Circular Externa 038 de 2025, MinSalud (MGTE, Fase I)') on conflict (name) do update set dias_max_mgte = excluded.dias_max_mgte, fuente_mgte = excluded.fuente_mgte;
update public.specialties set dias_max_mgte = 10, fuente_mgte = 'Circular Externa 038 de 2025, MinSalud (MGTE, Fase I)' where name = 'Ginecología';
insert into public.specialties (name, description, dias_max_mgte, fuente_mgte) values ('Psiquiatría', '', 10, 'Circular Externa 038 de 2025, MinSalud (MGTE, Fase I)') on conflict (name) do update set dias_max_mgte = excluded.dias_max_mgte, fuente_mgte = excluded.fuente_mgte;
insert into public.specialties (name, description, dias_max_mgte, fuente_mgte) values ('Cirugía General', '', 10, 'Circular Externa 038 de 2025, MinSalud (MGTE, Fase I)') on conflict (name) do update set dias_max_mgte = excluded.dias_max_mgte, fuente_mgte = excluded.fuente_mgte;
insert into public.specialties (name, description, dias_max_mgte, fuente_mgte) values ('Medicina Interna', '', 15, 'Circular Externa 038 de 2025, MinSalud (MGTE, Fase I)') on conflict (name) do update set dias_max_mgte = excluded.dias_max_mgte, fuente_mgte = excluded.fuente_mgte;
update public.specialties set dias_max_mgte = null, fuente_mgte = 'Sin estándar en la Circular 038 de 2025; la simulación usa 20 días como parámetro declarado' where name = 'Cardiología';
update public.specialties set dias_max_mgte = null, fuente_mgte = 'Sin estándar en la Circular 038 de 2025; la simulación usa 20 días como parámetro declarado' where name = 'Dermatología';
update public.specialties set dias_max_mgte = null, fuente_mgte = 'Sin estándar en la Circular 038 de 2025; la simulación usa 20 días como parámetro declarado' where name = 'Oftalmología';
update public.specialties set dias_max_mgte = null, fuente_mgte = 'Sin estándar en la Circular 038 de 2025; la simulación usa 20 días como parámetro declarado' where name = 'Ortopedia';
update public.specialties set dias_max_mgte = null, fuente_mgte = 'Sin estándar en la Circular 038 de 2025; la simulación usa 20 días como parámetro declarado' where name = 'Psicología';

-- ─── Sedes reales de IPS (REPS) ───
insert into public.ips_sedes (id, codigo_habilitacion_sede, nit_prestador, nombre_prestador, nombre_sede, direccion, telefono, naturaleza_juridica, es_ese, fuente, fecha_corte) values
  ('85feb33e-843f-4f23-8cee-6eb4cbae1b6f', '110010817105', '860007336', 'Caja Colombiana De Subsidio Familiar Colsubsidio', 'CENTRO MEDICO COLSUBSIDIO CALLE 26', 'Calle 27 # 24-87  PI 2 Y 3', '7420100 ext. 71783, 7563646', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('d150faa0-a15e-4e0a-9ff6-a692677a84cd', '110010817106', '860007336', 'Caja Colombiana De Subsidio Familiar Colsubsidio', 'CENTRO MEDICO CIUDADELA COLSUBSIDIO', 'CRA 111 A # 82 36', '7421122 - 7461120', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('93970268-be3a-4886-a8f5-d5869d724540', '110010817107', '860007336', 'Caja Colombiana De Subsidio Familiar Colsubsidio', 'CENTRO MEDICO COLSUBSIDIO CALLE 63', 'KR 24 # 62 50 PI 2 al 6', '7565500', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('efd24a68-9acf-41cc-834a-7e1cdf464af0', '110010952301', '800003765', 'Virrey Solis Ips. S.A.', 'VIRREY SOLIS I.P.S S.A. OLAYA', 'CLL 27 SUR No 21 A 19', '4473535 EXT 278, 248, 246', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('075ca0e9-45c2-4ace-bae6-2f58976f43e3', '110010952304', '800003765', 'Virrey Solis Ips. S.A.', 'VIRREY SOLIS IPS S.A- ENSUEÑO', 'CL 59 SUR N° 51 - 21 LOCAL 244 Y 245', '4473535 EXT 278, 476, 248', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('58e7f541-9c12-42a4-acc4-a6fc623bdc4b', '110010952306', '800003765', 'Virrey Solis Ips. S.A.', 'VIRREY SOLIS IPS S.A-KENNEDY', 'KR 78 F # 41 B 06 SUR', '4473535 EXT 278, 476, 248', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('67a32a9a-d87e-4d6f-bd29-ce7586c549a8', '110013630001', '901041691', 'Centros Medicos Colsanitas S.A.S', 'CENTRO MÉDICO COLSANITAS PREMIUM SANTA ANA', 'ED TO EMPRESARIAL PACIFIC - CLL 110  No. 9 - 25. Pi 1 costado oriental, Pi 2', '6466060 EXT: 5711495', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('d0114143-b169-45da-aed5-cdfcb9f2686a', '110013630002', '901041691', 'Centros Medicos Colsanitas S.A.S', 'CENTRO MEDICO COLSANITAS PREMIUM LA CALLEJA', 'CL 127 # 20 16 PI 6 IN 2, IN 3, IN 4', '6466060 ext 5712052', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('2a79d79d-9b01-4bcb-a10c-fa7c9f412ec8', '110013630003', '901041691', 'Centros Medicos Colsanitas S.A.S', 'CENTRO MEDICO COLSANITAS PREMIUM 108', 'AK 45 #108A-50 ED BOSH P2', '6466060 ext 5712052', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('b29f8838-f04f-4b31-b3e8-dae2e1f5edca', '110010733502', '860066942', 'Caja De Compensacion Familiar Compensar', 'UNIDAD DE SERVICIOS KENNEDY', 'TV 78 H # 41 C 48 SUR', '601 4285088', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('e5c3dd1a-c9c7-467a-becc-3813bf7ee399', '110010733503', '860066942', 'Caja De Compensacion Familiar Compensar', 'UNIDAD DE SERVICIOS CALLE 26', 'AC 26 No 66 A 48', '601 4285088', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('219fca11-26a3-4675-a4a9-4b39ec947c94', '110010733504', '860066942', 'Caja De Compensacion Familiar Compensar', 'UNIDAD DE SERVICIOS CALLE 42', 'CL 42 # 13-19 TO A TO B', '601 4285088', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('2b4bfc88-1cd9-4fe2-922e-ee92067135b8', '110010778204', '811007832', 'Servicios De Salud Ips Suramericana S.A.S', 'IPS SURA SANTA BARBARA', 'AK 19 123 52', '4824601 / 3164625445', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('969fa80d-fd52-4b34-8391-17692900f179', '110010778206', '811007832', 'Servicios De Salud Ips Suramericana S.A.S', 'IPS SURA OLAYA BOGOTA', 'AK 14 # 26 A 79 SUR', '3178528626', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('b0b6244b-93c8-4851-ab14-09e33ff481a4', '110010778209', '811007832', 'Servicios De Salud Ips Suramericana S.A.S', 'SALUD SURA CALLE 100 BOGOTA', 'Cl. 100 No. 19 A - 35', '(1) 487 38 88  / 3164625445', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('a386c111-88b5-4b00-99da-3d06bbd12f83', '110010559701', '860013570', 'Caja De Compensación Familiar Cafam', 'Centro de Atención en Salud Cafam Calle 51', 'Kr 15  No. 51 - 35', '5550700 ext 12017-12015', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('f12a3ee4-343b-4957-b240-64bfc686d37f', '110010559702', '860013570', 'Caja De Compensación Familiar Cafam', 'Centro de Atención en Salud Cafam Clínica Calle 51', 'Calle 51 No. 15- 34', '5550700 ext 12017-12015', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('b3f7deae-ea21-42c1-bb05-8850525fdeb2', '110010559704', '860013570', 'Caja De Compensación Familiar Cafam', 'Centro de Atención en Salud Cafam Floresta', 'AK 68 No.90-88', '5550700 ext 12017-12015', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('a2dc96c8-81a6-4eaa-bb44-f945d8b513d2', '110010817102', '860007336', 'Caja Colombiana De Subsidio Familiar Colsubsidio', 'CLINICA INFANTIL COLSUBSIDIO', 'CALLE 66 # 10 - 48', '7467310 extensión 75210', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('23088e15-a603-44be-a2ef-06e376d79e8e', '110010817103', '860007336', 'Caja Colombiana De Subsidio Familiar Colsubsidio', 'CLINICA COLSUBSIDIO CIUDAD ROMA', 'CALLE 53 SUR # 79 D 71', '7420100 Ext. 74439', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('31ec2bc6-3898-4b28-be04-974374caca76', '110010817104', '860007336', 'Caja Colombiana De Subsidio Familiar Colsubsidio', 'CENTRO MEDICO COLSUBSIDIO USAQUEN', 'AK7 # 123 65 PI 3 - 4 - 5', '6017420100', 'Privada', false, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('4c3a2d63-850b-4e4b-b3e4-fd0f579b81fd', '110013029601', '900959048', 'Subred Integrada De Servicios De Salud Sur Occidente E.S.E', 'Hospital Occidente de Kennedy', 'TV 74 F # 40 B 54 SUR', '3849160', 'Pública', true, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('33f805d4-f6f3-4057-95bb-4d46aea04f34', '110013029603', '900959048', 'Subred Integrada De Servicios De Salud Sur Occidente E.S.E', 'Hospital Pediátrico Tintal', 'CALLE 10 # 86 - 58', '5550950', 'Pública', true, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('bf755d1a-7c8a-4408-ac17-c71fc67b6496', '110013029101', '900971006', 'Subred Integrada De Servicios De Salud Norte E.S.E', 'UNIDAD DE SERVICIOS DE SALUD SIMÓN BOLÍVAR', 'CALLE 165 # 7 06', '4431790', 'Pública', true, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('c4c80e39-14aa-4f19-86f8-7d0144dcc197', '110013029102', '900971006', 'Subred Integrada De Servicios De Salud Norte E.S.E', 'UNIDAD DE SERVICIOS DE SALUD FRAY BARTOLOMÉ DE LAS CASAS', 'CARRERA 65 # 103 66', '4431790', 'Pública', true, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('710bb306-bae0-4a4e-9e0c-2a66179d22cd', '110013029401', '900958564', 'Subred Integrada De Servicios De Salud Sur E.S.E.', 'UNIDAD DE SERVICIOS DE SALUD EL TUNAL', 'CR 20  47B-35 SUR', '7300000 Opción 0', 'Pública', true, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('0792cdeb-d9ee-4cdb-9108-434e0a4e6fa1', '110013029402', '900958564', 'Subred Integrada De Servicios De Salud Sur E.S.E.', 'UNIDAD DE SERVICIOS DE SALUD MEISSEN', 'KR 18 B No. 60 G - 36  SUR', '7300000 Opción 0', 'Pública', true, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('b672be15-085e-406c-b7d4-dc47e6a06b2e', '110013028901', '900959051', 'Subred Integrada De Servicios De Salud Centro Oriente E.S.E', 'UNIDAD DE SERVICIOS DE SALUD SANTA CLARA HOSPITAL UNIVERSITARIO', 'CARRERA 14 B NUMERO 1-45 SUR', '3282828 ext 18191, 18000, 18151', 'Pública', true, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('bf8062c1-2c81-4a86-a041-c97f5f7e59f3', '110013028902', '900959051', 'Subred Integrada De Servicios De Salud Centro Oriente E.S.E', 'UNIDAD DE SERVICIOS DE SALUD SAN BLAS', 'TRANSVERSAL 5 ESTE NUMERO 19-50 SUR', '3282828 EXT 13192, 13941,13620', 'Pública', true, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('3f46ea6f-775e-484d-9514-ad195680d48d', '110013029605', '900959048', 'Subred Integrada De Servicios De Salud Sur Occidente E.S.E', 'Centro de Salud Abastos', 'Carrera 80C No. 2 - 40', '4126880', 'Pública', true, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('ab4ba400-f28e-4ed8-a691-7640c5e07105', '110013029607', '900959048', 'Subred Integrada De Servicios De Salud Sur Occidente E.S.E', 'Centro de Salud Alcalá Muzú', 'Carrera 52 No. 37 - 05 sur', '7280435', 'Pública', true, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12'),
  ('ef632333-4c8f-4d0c-b0c8-0e015fec75b4', '110013029608', '900959048', 'Subred Integrada De Servicios De Salud Sur Occidente E.S.E', 'Centro de Salud Bomberos', 'Calle 40C sur No. 79 - 10', '2732535', 'Pública', true, 'MinSalud, REPS (datos.gov.co c36g-9fc2)', '2026-03-12')
on conflict (codigo_habilitacion_sede) do nothing;

-- ─── Red EPS → sede ───
insert into public.eps_red_sedes (eps_id, sede_id, tipo_relacion, soporte)
select e.id, s.id, v.tipo, v.soporte
from (values
  ('830113831', '110010817105', 'asignada_simulacion', 'Asignación hecha para la simulación; no se afirma una relación contractual real'),
  ('830113831', '110010817106', 'asignada_simulacion', 'Asignación hecha para la simulación; no se afirma una relación contractual real'),
  ('830113831', '110010817107', 'asignada_simulacion', 'Asignación hecha para la simulación; no se afirma una relación contractual real'),
  ('800130907', '110010952301', 'mismo_grupo', 'Grupo empresarial documentado públicamente por las entidades'),
  ('800130907', '110010952304', 'mismo_grupo', 'Grupo empresarial documentado públicamente por las entidades'),
  ('800130907', '110010952306', 'mismo_grupo', 'Grupo empresarial documentado públicamente por las entidades'),
  ('800251440', '110013630001', 'mismo_grupo', 'Grupo empresarial documentado públicamente por las entidades'),
  ('800251440', '110013630002', 'mismo_grupo', 'Grupo empresarial documentado públicamente por las entidades'),
  ('800251440', '110013630003', 'mismo_grupo', 'Grupo empresarial documentado públicamente por las entidades'),
  ('860066942', '110010733502', 'misma_entidad', 'Mismo NIT de la EPS y de la IPS en el REPS'),
  ('860066942', '110010733503', 'misma_entidad', 'Mismo NIT de la EPS y de la IPS en el REPS'),
  ('860066942', '110010733504', 'misma_entidad', 'Mismo NIT de la EPS y de la IPS en el REPS'),
  ('800088702', '110010778204', 'mismo_grupo', 'Grupo empresarial documentado públicamente por las entidades'),
  ('800088702', '110010778206', 'mismo_grupo', 'Grupo empresarial documentado públicamente por las entidades'),
  ('800088702', '110010778209', 'mismo_grupo', 'Grupo empresarial documentado públicamente por las entidades'),
  ('830003564', '110010559701', 'asignada_simulacion', 'Asignación hecha para la simulación; no se afirma una relación contractual real'),
  ('830003564', '110010559702', 'asignada_simulacion', 'Asignación hecha para la simulación; no se afirma una relación contractual real'),
  ('830003564', '110010559704', 'asignada_simulacion', 'Asignación hecha para la simulación; no se afirma una relación contractual real'),
  ('900156264', '110010817102', 'asignada_simulacion', 'Asignación hecha para la simulación; no se afirma una relación contractual real'),
  ('900156264', '110010817103', 'asignada_simulacion', 'Asignación hecha para la simulación; no se afirma una relación contractual real'),
  ('900156264', '110010817104', 'asignada_simulacion', 'Asignación hecha para la simulación; no se afirma una relación contractual real'),
  ('900298372', '110013029601', 'red_publica_distrital', 'Subred Integrada de Servicios de Salud E.S.E. del Distrito Capital (red pública)'),
  ('900298372', '110013029603', 'red_publica_distrital', 'Subred Integrada de Servicios de Salud E.S.E. del Distrito Capital (red pública)'),
  ('900298372', '110013029101', 'red_publica_distrital', 'Subred Integrada de Servicios de Salud E.S.E. del Distrito Capital (red pública)'),
  ('900298372', '110013029102', 'red_publica_distrital', 'Subred Integrada de Servicios de Salud E.S.E. del Distrito Capital (red pública)'),
  ('900298372', '110013029401', 'red_publica_distrital', 'Subred Integrada de Servicios de Salud E.S.E. del Distrito Capital (red pública)'),
  ('900298372', '110013029402', 'red_publica_distrital', 'Subred Integrada de Servicios de Salud E.S.E. del Distrito Capital (red pública)'),
  ('900298372', '110013028901', 'red_publica_distrital', 'Subred Integrada de Servicios de Salud E.S.E. del Distrito Capital (red pública)'),
  ('900298372', '110013028902', 'red_publica_distrital', 'Subred Integrada de Servicios de Salud E.S.E. del Distrito Capital (red pública)'),
  ('837000084', '110013029605', 'asignada_simulacion', 'Asignación hecha para la simulación; no se afirma una relación contractual real'),
  ('837000084', '110013029607', 'asignada_simulacion', 'Asignación hecha para la simulación; no se afirma una relación contractual real'),
  ('837000084', '110013029608', 'asignada_simulacion', 'Asignación hecha para la simulación; no se afirma una relación contractual real')
) as v(nit, codigo, tipo, soporte)
join public.eps e on e.nit = v.nit
join public.ips_sedes s on s.codigo_habilitacion_sede = v.codigo
on conflict do nothing;

-- ─── Médicos del MVP: se desactivan (inventados) y se eliminan sus horarios sin citas ───
update public.doctors set active = false where license_number not like 'SIM-%';
delete from public.availability_slots s
 where s.doctor_id in (select id from public.doctors where license_number not like 'SIM-%')
   and not exists (select 1 from public.appointments a where a.slot_id = s.id);

-- ─── Médicos sintéticos de la simulación ───
insert into public.doctors (id, full_name, specialty_id, eps_id, license_number, sede_id, sintetico, dias_atencion, duracion_cita_min, active)
select v.id::uuid, v.nombre, sp.id, e.id, v.registro, s.id, true, v.dias::smallint[], v.duracion, true
from (values
  ('8f6796f1-1a88-457c-b875-b949ada1431a', 'Dr. Ricardo Gómez Hernández', 'Medicina General', '830113831', 'SIM-00001', '110010817105', '{1,2,3,4,5}', 20),
  ('e2a53f06-291f-437d-bb60-f4872ce93b2a', 'Dra. Ángela Gómez Pérez', 'Medicina General', '830113831', 'SIM-00002', '110010817106', '{1,2,3,4,5}', 20),
  ('bd330cbd-7d8c-46c5-a0d0-4b9e60a0f5c2', 'Dr. Andrés Torres Parra', 'Medicina General', '830113831', 'SIM-00003', '110010817107', '{1,2,3,4,5}', 20),
  ('e4d2ccf7-7a77-4b71-b986-10451e93a4a8', 'Dr. Ricardo Sánchez Medina', 'Pediatría', '830113831', 'SIM-00004', '110010817105', '{1,2,3,4,5}', 20),
  ('9091f758-c224-4667-85c9-1f57594090e2', 'Dra. Juliana Díaz Torres', 'Pediatría', '830113831', 'SIM-00005', '110010817106', '{1,2,3,4,5}', 20),
  ('fe40fce5-376e-47fe-bf74-a27d9b787597', 'Dra. Andrea Jiménez López', 'Obstetricia', '830113831', 'SIM-00006', '110010817107', '{1,3,5}', 30),
  ('a4c9ea19-28ba-49b0-bee1-b19931cc3235', 'Dra. Sandra Suárez García', 'Ginecología', '830113831', 'SIM-00007', '110010817105', '{2,4}', 30),
  ('09cf1f7e-d37e-4c2a-be88-743390f9dd44', 'Dra. Luz López Rojas', 'Psiquiatría', '830113831', 'SIM-00008', '110010817106', '{1,3}', 30),
  ('5bb2d930-257f-4926-8086-9ace1633fb42', 'Dr. Javier Pérez Díaz', 'Cirugía General', '830113831', 'SIM-00009', '110010817107', '{2,5}', 30),
  ('c5bb3cf1-a119-4209-b88f-edb8d0580731', 'Dr. Carlos Rojas Gómez', 'Medicina Interna', '830113831', 'SIM-00010', '110010817105', '{1,4}', 30),
  ('679373f2-cb26-4c86-9ca4-0dc3a186d783', 'Dra. Marcela Díaz Díaz', 'Cardiología', '830113831', 'SIM-00011', '110010817106', '{3}', 30),
  ('fca6121d-3d34-4561-bd6e-e944ccf595d6', 'Dr. Diego Ortiz Ramírez', 'Dermatología', '830113831', 'SIM-00012', '110010817107', '{2}', 20),
  ('53ec2a98-d5d9-4e32-a6e3-f11c3469b867', 'Dr. Hernán Pérez Hernández', 'Oftalmología', '830113831', 'SIM-00013', '110010817105', '{4}', 20),
  ('c24ec0da-e267-49ce-b481-704b27e82387', 'Dra. Claudia Ortiz Vargas', 'Ortopedia', '830113831', 'SIM-00014', '110010817106', '{5}', 30),
  ('454d8669-09be-4007-9ec3-e0b64c74fba0', 'Dr. Andrés Moreno Torres', 'Psicología', '830113831', 'SIM-00015', '110010817107', '{1,2,3,4,5}', 40),
  ('6f2abd96-39fc-459a-b69a-812785c22ab0', 'Dr. Juan Ramírez Moreno', 'Medicina General', '800130907', 'SIM-00016', '110010952301', '{1,2,3,4,5}', 20),
  ('77b7ed14-70ca-4d57-a7e1-1a808dd69d55', 'Dra. Marcela Parra González', 'Medicina General', '800130907', 'SIM-00017', '110010952304', '{1,2,3,4,5}', 20),
  ('b52b2962-3941-4ce7-986f-cdd179a3f1d3', 'Dr. Jorge Suárez Rojas', 'Medicina General', '800130907', 'SIM-00018', '110010952306', '{1,2,3,4,5}', 20),
  ('dfbc43d3-a101-4e0b-a890-57062d454f1e', 'Dr. Felipe Medina Ruiz', 'Pediatría', '800130907', 'SIM-00019', '110010952301', '{1,2,3,4,5}', 20),
  ('e28a8be2-b2dd-4a48-a653-7043404539ad', 'Dra. Claudia Torres Rojas', 'Pediatría', '800130907', 'SIM-00020', '110010952304', '{1,2,3,4,5}', 20),
  ('89131dd2-52fd-4218-98a5-c0a8eabd7ad9', 'Dr. Hernán Herrera López', 'Obstetricia', '800130907', 'SIM-00021', '110010952306', '{1,3,5}', 30),
  ('19f60cd3-715d-4bf6-8e6a-14a884011109', 'Dra. Liliana García López', 'Ginecología', '800130907', 'SIM-00022', '110010952301', '{2,4}', 30),
  ('eefeb517-eea5-4fcc-ac00-93b30e75db3c', 'Dr. Diego Ruiz Hernández', 'Psiquiatría', '800130907', 'SIM-00023', '110010952304', '{1,3}', 30),
  ('d37136b2-5cfa-4892-9a2f-3c7f523efea8', 'Dr. Diego Rodríguez Gómez', 'Cirugía General', '800130907', 'SIM-00024', '110010952306', '{2,5}', 30),
  ('7b84a988-b1e5-486c-abd6-b9093cf7a9df', 'Dr. Jorge Martínez Ortiz', 'Medicina Interna', '800130907', 'SIM-00025', '110010952301', '{1,4}', 30),
  ('7d5e506e-96f1-4143-b9d7-92a4fe0f33f8', 'Dr. Carlos Pérez Moreno', 'Cardiología', '800130907', 'SIM-00026', '110010952304', '{3}', 30),
  ('642fc311-a69f-49f2-a03e-c87a84f1fc77', 'Dra. Diana Martínez Moreno', 'Dermatología', '800130907', 'SIM-00027', '110010952306', '{2}', 20),
  ('5ed3fb7b-850f-439d-96c0-f7d29439508f', 'Dr. Carlos Sánchez Torres', 'Oftalmología', '800130907', 'SIM-00028', '110010952301', '{4}', 20),
  ('5a1042a1-6ba1-4b6c-87e5-9ba344b771ea', 'Dr. Luis Medina Parra', 'Ortopedia', '800130907', 'SIM-00029', '110010952304', '{5}', 30),
  ('18723f9c-fe2d-41cf-8ee0-c9a851da10cc', 'Dra. Catalina Vargas Ramírez', 'Psicología', '800130907', 'SIM-00030', '110010952306', '{1,2,3,4,5}', 40),
  ('2c5001ca-dd6f-4255-b541-dd7d4747b4cb', 'Dr. Javier Rodríguez Vargas', 'Medicina General', '800251440', 'SIM-00031', '110013630001', '{1,2,3,4,5}', 20),
  ('c7e12ea5-86bb-49d6-8e7b-d6beed6f3833', 'Dr. Felipe Medina López', 'Medicina General', '800251440', 'SIM-00032', '110013630002', '{1,2,3,4,5}', 20),
  ('6bbe4ae4-8a1a-49fa-aed8-9abeadcad0a5', 'Dr. Camilo Hernández Cárdenas', 'Medicina General', '800251440', 'SIM-00033', '110013630003', '{1,2,3,4,5}', 20),
  ('b82bc4ce-3f91-4cc1-9af1-0b110f5679e9', 'Dra. Adriana Sánchez Rodríguez', 'Pediatría', '800251440', 'SIM-00034', '110013630001', '{1,2,3,4,5}', 20),
  ('25e6712a-9e21-4a03-9229-fc8620f9ea11', 'Dr. Camilo Pérez Ortiz', 'Pediatría', '800251440', 'SIM-00035', '110013630002', '{1,2,3,4,5}', 20),
  ('c0a349a9-0fce-4f71-bb33-17b16006eb60', 'Dr. Ricardo Castro Rojas', 'Obstetricia', '800251440', 'SIM-00036', '110013630003', '{1,3,5}', 30),
  ('1c92b59a-c255-45e8-b46d-216c6d9a43be', 'Dra. Paola Hernández Rojas', 'Ginecología', '800251440', 'SIM-00037', '110013630001', '{2,4}', 30),
  ('3fd081c6-cee4-43ae-ae68-1e103e21ad5b', 'Dra. Carolina Jiménez Ortiz', 'Psiquiatría', '800251440', 'SIM-00038', '110013630002', '{1,3}', 30),
  ('a906f9a7-9c53-43cd-bbf1-eb0abe2b6eec', 'Dr. Mauricio Castro Rodríguez', 'Cirugía General', '800251440', 'SIM-00039', '110013630003', '{2,5}', 30),
  ('2307ab26-bc3e-4226-a2bb-a0b32e6524ad', 'Dr. Andrés Cárdenas Sánchez', 'Medicina Interna', '800251440', 'SIM-00040', '110013630001', '{1,4}', 30),
  ('b56ee903-0215-403b-b169-4fbe9cd2a781', 'Dra. Ángela Herrera Castro', 'Cardiología', '800251440', 'SIM-00041', '110013630002', '{3}', 30),
  ('60db286e-735a-4ad3-948e-f82ea3ab48cd', 'Dr. Sergio Suárez Hernández', 'Dermatología', '800251440', 'SIM-00042', '110013630003', '{2}', 20),
  ('256051cd-f283-4151-9a62-ed133609e1ac', 'Dr. Ricardo Pérez Jiménez', 'Oftalmología', '800251440', 'SIM-00043', '110013630001', '{4}', 20),
  ('398ba716-f038-41f1-950e-34c145234c26', 'Dr. Fabián Suárez Parra', 'Ortopedia', '800251440', 'SIM-00044', '110013630002', '{5}', 30),
  ('6e9301f9-7606-4e88-b1cf-a9800fc7650b', 'Dra. Diana Castro Rojas', 'Psicología', '800251440', 'SIM-00045', '110013630003', '{1,2,3,4,5}', 40),
  ('f63deb54-a94a-4c92-b16e-0cfe940a9860', 'Dr. Hernán Medina Pérez', 'Medicina General', '860066942', 'SIM-00046', '110010733502', '{1,2,3,4,5}', 20),
  ('980c8c2d-02f7-46a0-9d9b-2eb913cd0f80', 'Dra. Claudia Castro Torres', 'Medicina General', '860066942', 'SIM-00047', '110010733503', '{1,2,3,4,5}', 20),
  ('4abc25ec-98ba-440b-8eaa-579fef593edd', 'Dr. Óscar Rodríguez Gómez', 'Medicina General', '860066942', 'SIM-00048', '110010733504', '{1,2,3,4,5}', 20),
  ('fe954001-f261-40d4-b40a-f1259f91c55c', 'Dr. Camilo Ortiz Jiménez', 'Pediatría', '860066942', 'SIM-00049', '110010733502', '{1,2,3,4,5}', 20),
  ('330719eb-2a0b-4a42-a201-0cf8d7bb57b9', 'Dra. Ángela Herrera Ortiz', 'Pediatría', '860066942', 'SIM-00050', '110010733503', '{1,2,3,4,5}', 20),
  ('e47910fd-fffa-4a57-adcb-201698be512e', 'Dr. Sergio Cárdenas Torres', 'Obstetricia', '860066942', 'SIM-00051', '110010733504', '{1,3,5}', 30),
  ('d7cd4f64-4152-4343-a822-2a5a3d31d4be', 'Dra. Juliana Herrera Moreno', 'Ginecología', '860066942', 'SIM-00052', '110010733502', '{2,4}', 30),
  ('42f18df5-735d-4b4e-8600-07604bed688d', 'Dra. Viviana Martínez Vargas', 'Psiquiatría', '860066942', 'SIM-00053', '110010733503', '{1,3}', 30),
  ('97c31cf3-aae6-4d34-a69d-051b22021def', 'Dra. Adriana Ortiz Pérez', 'Cirugía General', '860066942', 'SIM-00054', '110010733504', '{2,5}', 30),
  ('64733b86-a4d4-4006-afb4-0b028ee6d9be', 'Dra. Adriana Pérez Hernández', 'Medicina Interna', '860066942', 'SIM-00055', '110010733502', '{1,4}', 30),
  ('2fa4d2c4-0359-4169-905c-b9c83b03f84d', 'Dra. Viviana Rodríguez Castro', 'Cardiología', '860066942', 'SIM-00056', '110010733503', '{3}', 30),
  ('ad137aa4-a119-467e-99f5-8d9423b295c7', 'Dr. Óscar Parra Hernández', 'Dermatología', '860066942', 'SIM-00057', '110010733504', '{2}', 20),
  ('fcda90c1-f5ea-4dc0-903d-32abe6307e32', 'Dra. Sandra Castro Cárdenas', 'Oftalmología', '860066942', 'SIM-00058', '110010733502', '{4}', 20),
  ('c16dcfc1-8d4f-4b5f-a9e9-1e940843286b', 'Dra. Adriana Ramírez Parra', 'Ortopedia', '860066942', 'SIM-00059', '110010733503', '{5}', 30),
  ('8f79e5f5-6a82-4ded-ab92-4b3e675121b1', 'Dr. Javier Parra Vargas', 'Psicología', '860066942', 'SIM-00060', '110010733504', '{1,2,3,4,5}', 40),
  ('a192b733-8fde-4d9f-ab9c-345664b9a7db', 'Dra. Paola Medina Torres', 'Medicina General', '800088702', 'SIM-00061', '110010778204', '{1,2,3,4,5}', 20),
  ('beaa3f52-df60-430b-b6b2-6aeec390e5d8', 'Dra. Juliana Ortiz Hernández', 'Medicina General', '800088702', 'SIM-00062', '110010778206', '{1,2,3,4,5}', 20),
  ('fc92e463-d27c-422a-8e7d-9de4c09fcc20', 'Dr. Juan Martínez Medina', 'Medicina General', '800088702', 'SIM-00063', '110010778209', '{1,2,3,4,5}', 20),
  ('f4d42e3b-28fc-4b8e-8d97-67e3f3c0d75b', 'Dr. Andrés Díaz Rojas', 'Pediatría', '800088702', 'SIM-00064', '110010778204', '{1,2,3,4,5}', 20),
  ('3895c008-b1f6-4733-8982-2a2324045d28', 'Dra. Juliana Cárdenas López', 'Pediatría', '800088702', 'SIM-00065', '110010778206', '{1,2,3,4,5}', 20),
  ('6fcf566a-33c1-460a-80da-19e237bf4676', 'Dr. Felipe Castro Medina', 'Obstetricia', '800088702', 'SIM-00066', '110010778209', '{1,3,5}', 30),
  ('588c77d8-e924-41b7-9fd9-0a3f9c19c48f', 'Dr. Javier Herrera Suárez', 'Ginecología', '800088702', 'SIM-00067', '110010778204', '{2,4}', 30),
  ('2614803c-9c92-4734-80c8-b6f5f9bd6c8f', 'Dr. Juan Gómez Sánchez', 'Psiquiatría', '800088702', 'SIM-00068', '110010778206', '{1,3}', 30),
  ('afbbc05b-9e11-4af8-a3d7-f8c497d91648', 'Dra. Juliana Rojas García', 'Cirugía General', '800088702', 'SIM-00069', '110010778209', '{2,5}', 30),
  ('dad2462d-83cc-47cf-95ba-d0f028ebe25f', 'Dr. Jorge Sánchez Ortiz', 'Medicina Interna', '800088702', 'SIM-00070', '110010778204', '{1,4}', 30),
  ('c6bf541c-b491-4df5-952a-5d140ee73584', 'Dra. Claudia López López', 'Cardiología', '800088702', 'SIM-00071', '110010778206', '{3}', 30),
  ('ae051a86-2ae6-492b-9598-8774242c013f', 'Dra. Andrea Medina Hernández', 'Dermatología', '800088702', 'SIM-00072', '110010778209', '{2}', 20),
  ('bbd93568-40a3-4994-80b9-cfe50fb62b7c', 'Dra. María Vargas Pérez', 'Oftalmología', '800088702', 'SIM-00073', '110010778204', '{4}', 20),
  ('1b1b610b-c57c-4096-a57c-41c3ab4b3215', 'Dr. Diego Ruiz Cárdenas', 'Ortopedia', '800088702', 'SIM-00074', '110010778206', '{5}', 30),
  ('10fe7425-ef21-4250-a9d4-670ad3b0c569', 'Dr. Luis González Sánchez', 'Psicología', '800088702', 'SIM-00075', '110010778209', '{1,2,3,4,5}', 40),
  ('c9451ae5-2c19-4db3-8412-3ba4274be43e', 'Dra. Sandra Rojas Parra', 'Medicina General', '830003564', 'SIM-00076', '110010559701', '{1,2,3,4,5}', 20),
  ('f785d40b-adfd-4941-aa05-566b44327a82', 'Dra. Andrea Parra Cárdenas', 'Medicina General', '830003564', 'SIM-00077', '110010559702', '{1,2,3,4,5}', 20),
  ('dfb2221c-7e96-4a2c-80ee-5f9b0a796bd4', 'Dra. Claudia Rojas Ruiz', 'Medicina General', '830003564', 'SIM-00078', '110010559704', '{1,2,3,4,5}', 20),
  ('2e8f88ab-b8d5-44d8-a989-736866bc987d', 'Dr. Felipe García Cárdenas', 'Pediatría', '830003564', 'SIM-00079', '110010559701', '{1,2,3,4,5}', 20),
  ('9b122a8e-dbb0-481f-8b7d-36a2c5e363d7', 'Dra. Adriana Suárez Díaz', 'Pediatría', '830003564', 'SIM-00080', '110010559702', '{1,2,3,4,5}', 20),
  ('98aacf9e-2bad-441d-94f8-f615faae07b7', 'Dra. Natalia Jiménez Pérez', 'Obstetricia', '830003564', 'SIM-00081', '110010559704', '{1,3,5}', 30),
  ('dfece6f6-8041-4e34-8c13-42d77b07fcb3', 'Dr. Felipe Castro Torres', 'Ginecología', '830003564', 'SIM-00082', '110010559701', '{2,4}', 30),
  ('c40de5c0-e584-41df-8b85-e73f24d8919e', 'Dr. Diego Suárez Medina', 'Psiquiatría', '830003564', 'SIM-00083', '110010559702', '{1,3}', 30),
  ('53ce73d1-930d-4878-bd17-e8a8b8092609', 'Dr. Luis López Ramírez', 'Cirugía General', '830003564', 'SIM-00084', '110010559704', '{2,5}', 30),
  ('b4d36993-f038-4d67-8f2c-525b65f39950', 'Dr. Óscar Martínez Suárez', 'Medicina Interna', '830003564', 'SIM-00085', '110010559701', '{1,4}', 30),
  ('188abfac-581d-4da2-acbb-641c9b4ad18e', 'Dra. María Gómez Rodríguez', 'Cardiología', '830003564', 'SIM-00086', '110010559702', '{3}', 30),
  ('f80cc1ec-2740-46d5-af35-c0e7ee32b0ed', 'Dr. Ricardo Ramírez González', 'Dermatología', '830003564', 'SIM-00087', '110010559704', '{2}', 20),
  ('5f4cba9b-c541-4d70-9212-1f4171822859', 'Dr. Juan Castro Gómez', 'Oftalmología', '830003564', 'SIM-00088', '110010559701', '{4}', 20),
  ('b395b02f-2dbe-4ab5-a8a8-a6e8d993f4a5', 'Dra. Carolina Herrera Ramírez', 'Ortopedia', '830003564', 'SIM-00089', '110010559702', '{5}', 30),
  ('af39449d-19d4-4384-8fcf-a39506d67130', 'Dra. Catalina Torres Jiménez', 'Psicología', '830003564', 'SIM-00090', '110010559704', '{1,2,3,4,5}', 40),
  ('401d716e-3a0d-49f5-b721-c6714d4b66fc', 'Dr. Mauricio Rojas Rojas', 'Medicina General', '900156264', 'SIM-00091', '110010817102', '{1,2,3,4,5}', 20),
  ('f8501ab5-5834-4e29-891d-02d8478c82e3', 'Dr. Felipe Torres Martínez', 'Medicina General', '900156264', 'SIM-00092', '110010817103', '{1,2,3,4,5}', 20),
  ('ad2aa7b1-9418-47be-8b6e-ea7f3c468e2e', 'Dra. Claudia González Ruiz', 'Medicina General', '900156264', 'SIM-00093', '110010817104', '{1,2,3,4,5}', 20),
  ('c557f787-ca27-46ae-9957-33593eefefe6', 'Dra. Luz Gómez López', 'Pediatría', '900156264', 'SIM-00094', '110010817102', '{1,2,3,4,5}', 20),
  ('b10c71fc-20ef-4bd3-9475-7308ca576a70', 'Dra. Andrea Vargas Vargas', 'Pediatría', '900156264', 'SIM-00095', '110010817103', '{1,2,3,4,5}', 20),
  ('0d91020d-7448-4095-9a30-d45ea1809954', 'Dra. Adriana Torres López', 'Obstetricia', '900156264', 'SIM-00096', '110010817104', '{1,3,5}', 30),
  ('71b8fe5a-fc8d-4276-8cbe-c90484bd1714', 'Dra. Natalia Hernández Ortiz', 'Ginecología', '900156264', 'SIM-00097', '110010817102', '{2,4}', 30),
  ('b5800c1a-c5a7-4e7b-863b-65fa0ccc83cb', 'Dr. Diego Herrera Gómez', 'Psiquiatría', '900156264', 'SIM-00098', '110010817103', '{1,3}', 30),
  ('796a6c2e-3108-4aa1-b43f-ffe4318412e8', 'Dr. Óscar Ruiz Ramírez', 'Cirugía General', '900156264', 'SIM-00099', '110010817104', '{2,5}', 30),
  ('251c6956-5562-4a95-a806-427b7fc2a4f6', 'Dra. Paola Medina Parra', 'Medicina Interna', '900156264', 'SIM-00100', '110010817102', '{1,4}', 30),
  ('1db6b677-ae89-4c10-921f-20ed781a5a45', 'Dra. Luz Moreno Rodríguez', 'Cardiología', '900156264', 'SIM-00101', '110010817103', '{3}', 30),
  ('c7888d69-5c4e-415e-b1cd-2e06cf120305', 'Dr. Hernán Suárez Ruiz', 'Dermatología', '900156264', 'SIM-00102', '110010817104', '{2}', 20),
  ('7d6fa1c4-4a30-41ff-9054-0c42605d493a', 'Dr. Diego Jiménez Hernández', 'Oftalmología', '900156264', 'SIM-00103', '110010817102', '{4}', 20),
  ('729cac8c-8873-4977-b3d7-be7be3f561af', 'Dra. Andrea Díaz Ortiz', 'Ortopedia', '900156264', 'SIM-00104', '110010817103', '{5}', 30),
  ('dc283b07-2088-4c01-bb92-efa9bffce3e0', 'Dr. Felipe Moreno Ramírez', 'Psicología', '900156264', 'SIM-00105', '110010817104', '{1,2,3,4,5}', 40),
  ('dc7c8127-85bd-421a-ae4a-7ce26ddbf71e', 'Dra. Viviana Hernández Cárdenas', 'Medicina General', '900298372', 'SIM-00106', '110013029601', '{1,2,3,4,5}', 20),
  ('04ab53d7-7bb8-4c0c-9241-2e73ff9c7e0d', 'Dr. Hernán Ortiz Parra', 'Medicina General', '900298372', 'SIM-00107', '110013029603', '{1,2,3,4,5}', 20),
  ('0cc9cc32-5ebc-4ea9-ac82-091f4269f9aa', 'Dra. Sandra Medina Rojas', 'Medicina General', '900298372', 'SIM-00108', '110013029101', '{1,2,3,4,5}', 20),
  ('c84a4fbc-c2df-4a2a-bd4d-f139e8331360', 'Dr. Hernán Cárdenas Ramírez', 'Pediatría', '900298372', 'SIM-00109', '110013029102', '{1,2,3,4,5}', 20),
  ('2c2e429d-8eb0-4f9b-82fc-683061172cb2', 'Dra. Luz Parra Cárdenas', 'Pediatría', '900298372', 'SIM-00110', '110013029401', '{1,2,3,4,5}', 20),
  ('b7453272-0605-4023-aaf7-91b35341bc67', 'Dra. Marcela González Torres', 'Obstetricia', '900298372', 'SIM-00111', '110013029402', '{1,3,5}', 30),
  ('726979bf-2603-4d1c-86a7-35021f7ac255', 'Dr. Óscar Gómez Torres', 'Ginecología', '900298372', 'SIM-00112', '110013028901', '{2,4}', 30),
  ('7fc4cd6e-941c-4770-b919-fff55a1d886b', 'Dr. Jorge Gómez González', 'Psiquiatría', '900298372', 'SIM-00113', '110013028902', '{1,3}', 30),
  ('dc99cb93-7a38-4c25-9d6e-2418a8c9a749', 'Dr. Alejandro Parra Pérez', 'Cirugía General', '900298372', 'SIM-00114', '110013029601', '{2,5}', 30),
  ('8cbdb971-c266-4fb7-a900-4308f56367b7', 'Dr. Mauricio López Parra', 'Medicina Interna', '900298372', 'SIM-00115', '110013029603', '{1,4}', 30),
  ('03455bf5-c356-46ba-81f3-fde2b5829af0', 'Dra. Carolina Parra Torres', 'Cardiología', '900298372', 'SIM-00116', '110013029101', '{3}', 30),
  ('59736581-ab1a-4a3e-ac81-f8730c0b8b92', 'Dr. Jorge Martínez Hernández', 'Dermatología', '900298372', 'SIM-00117', '110013029102', '{2}', 20),
  ('4c0e628f-7852-4073-a40e-23a5aee57789', 'Dr. Fabián Ortiz García', 'Oftalmología', '900298372', 'SIM-00118', '110013029401', '{4}', 20),
  ('0871ee81-ccd7-4b21-b21a-820f043bdf28', 'Dr. Juan Gómez García', 'Ortopedia', '900298372', 'SIM-00119', '110013029402', '{5}', 30),
  ('8da4959f-c338-4454-b089-384316444578', 'Dra. Marcela Herrera Moreno', 'Psicología', '900298372', 'SIM-00120', '110013028901', '{1,2,3,4,5}', 40),
  ('865decd8-2a3b-4314-b87c-417c10a20aca', 'Dra. Sandra García Parra', 'Medicina General', '837000084', 'SIM-00121', '110013029605', '{1,2,3,4,5}', 20),
  ('ec3760dc-133f-46d3-aedd-b7089dbcfe02', 'Dr. Andrés López Jiménez', 'Medicina General', '837000084', 'SIM-00122', '110013029607', '{1,2,3,4,5}', 20),
  ('90981c0f-c4ac-4523-a04a-be8048195396', 'Dra. Natalia Medina Sánchez', 'Medicina General', '837000084', 'SIM-00123', '110013029608', '{1,2,3,4,5}', 20),
  ('94cf7177-a9c4-4d6d-95b3-f1a69e1a7957', 'Dra. Paola Díaz López', 'Pediatría', '837000084', 'SIM-00124', '110013029605', '{1,2,3,4,5}', 20),
  ('0f419de9-fe52-4266-96d0-a11a912e3542', 'Dra. Andrea Hernández Moreno', 'Pediatría', '837000084', 'SIM-00125', '110013029607', '{1,2,3,4,5}', 20),
  ('787a1b07-729f-4908-a441-22a274bfb1bd', 'Dra. Juliana Parra Suárez', 'Obstetricia', '837000084', 'SIM-00126', '110013029608', '{1,3,5}', 30),
  ('adbb7d59-8e8a-4f2f-9252-f02096e3f4e5', 'Dra. Natalia Cárdenas Jiménez', 'Ginecología', '837000084', 'SIM-00127', '110013029605', '{2,4}', 30),
  ('b5544d5e-6678-47ce-91a3-c07edc1dd63c', 'Dr. Fabián Medina Torres', 'Psiquiatría', '837000084', 'SIM-00128', '110013029607', '{1,3}', 30),
  ('afa0ea5e-40b3-4658-adf5-a5a9606b193c', 'Dra. María Moreno Hernández', 'Cirugía General', '837000084', 'SIM-00129', '110013029608', '{2,5}', 30),
  ('e4c715b9-a5b5-48de-a443-c22bc12c0e90', 'Dra. Carolina Gómez Pérez', 'Medicina Interna', '837000084', 'SIM-00130', '110013029605', '{1,4}', 30),
  ('3177e771-5149-43b6-9f19-a1e68cfd83bf', 'Dra. Viviana Jiménez Pérez', 'Cardiología', '837000084', 'SIM-00131', '110013029607', '{3}', 30),
  ('e8b45673-8d83-46c4-810c-38801ab64405', 'Dra. Catalina Rojas Ruiz', 'Dermatología', '837000084', 'SIM-00132', '110013029608', '{2}', 20),
  ('aabb41a1-d4f3-4f50-8c56-b000d162c90a', 'Dra. Juliana Ramírez Martínez', 'Oftalmología', '837000084', 'SIM-00133', '110013029605', '{4}', 20),
  ('2b72eb25-963d-41b5-9db1-39e8f47b1b52', 'Dr. Alejandro Moreno Rodríguez', 'Ortopedia', '837000084', 'SIM-00134', '110013029607', '{5}', 30),
  ('991ab9a9-804b-465c-8888-a12717f6af43', 'Dra. Paola Ramírez Díaz', 'Psicología', '837000084', 'SIM-00135', '110013029608', '{1,2,3,4,5}', 40)
) as v(id, nombre, especialidad, nit, registro, sede, dias, duracion)
join public.specialties sp on sp.name = v.especialidad
join public.eps e on e.nit = v.nit
join public.ips_sedes s on s.codigo_habilitacion_sede = v.sede
on conflict (license_number) do nothing;
