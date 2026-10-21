-- ════════════════════════════════════════════════════════════════════════════
-- Pruebas de reglas de negocio del agendamiento (R-03, ADR-0005)
--
-- Se ejecuta completa dentro de UNA transacción que SIEMPRE se revierte: no deja
-- ningún cambio en la base de datos. Simula pacientes autenticados fijando
-- `request.jwt.claims` y el rol `authenticated`, exactamente como lo hace la
-- API REST de Supabase (PostgREST) con cada petición.
--
-- Uso: pegar en el editor SQL de Supabase (o ejecutar vía MCP/psql). El
-- resultado aparece como un error controlado "RESULTADO: N de M pruebas pasan",
-- que es el mecanismo que fuerza la reversión.
--
-- Resultado registrado el 26-sep-2026: 13 de 13 pruebas pasan.
-- Resultado registrado el 15-oct-2026: 17 de 17 (se suman T14–T17: H-36 y H-37).
-- Resultado registrado el 19-oct-2026: 31 de 31 (se suman T18–T31: modelo familiar, RF-13).
-- Resultado registrado el 20-oct-2026: 38 de 38 (se suman T32–T38: outbox FHIR, ADR-0009).
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  p1 uuid; p2 uuid; p3 uuid; v_eps uuid; v_otra_eps uuid; v_med uuid; v_med_otra uuid; v_esp uuid;
  s_libre uuid; s_libre2 uuid; s_libre3 uuid; s_pasado uuid; s_cerca uuid; s_otra_eps uuid;
  v_cita uuid; v_cita_cerca uuid;
  v_eps_fam uuid; v_med_fam uuid; s_fam uuid; s_libre4 uuid; f1 uuid; f2 uuid; v_cita_f1 uuid; v_n int;
  v_evento jsonb; v_cedula text; v_nombre text;
  v_ahora timestamp := (now() at time zone 'America/Bogota');
  v_cerca_inicio timestamp;
  res text[] := '{}'; pasan int := 0; total int := 0;
  resultado text;
begin
  -- ── Preparación (como dueño de la BD; se revierte al final) ──
  select id into p1 from public.profiles where role='patient' order by created_at limit 1;
  select id into p2 from public.profiles where role='patient' and id <> p1 order by created_at limit 1;
  select d.id, d.eps_id into v_med, v_eps from public.doctors d where d.active order by d.id limit 1;
  select id into v_otra_eps from public.eps where id <> v_eps limit 1;
  select id into v_med_otra from public.doctors where active and eps_id = v_otra_eps limit 1;
  update public.profiles set eps_id = v_eps where id in (p1, p2);
  delete from public.appointments where patient_id in (p1, p2) and status in ('scheduled','rescheduled');
  insert into public.availability_slots (doctor_id, date, start_time, end_time) values (v_med, current_date + 10, '08:00', '08:20') returning id into s_libre;
  insert into public.availability_slots (doctor_id, date, start_time, end_time) values (v_med, current_date + 11, '08:00', '08:20') returning id into s_libre2;
  insert into public.availability_slots (doctor_id, date, start_time, end_time) values (v_med, current_date - 1, '08:00', '08:20') returning id into s_pasado;
  -- Horario dentro de las próximas 24 h, sin cruzar la medianoche
  v_cerca_inicio := case when v_ahora::time > '21:00' then date_trunc('day', v_ahora) + interval '1 day 30 minutes'
                         else date_trunc('minute', v_ahora) + interval '2 hours' end;
  insert into public.availability_slots (doctor_id, date, start_time, end_time)
    values (v_med, v_cerca_inicio::date, v_cerca_inicio::time, (v_cerca_inicio + interval '20 minutes')::time) returning id into s_cerca;
  insert into public.availability_slots (doctor_id, date, start_time, end_time) values (v_med_otra, current_date + 10, '09:00', '09:20') returning id into s_otra_eps;
  -- p3: perfil sin EPS (H-37) y con una cita «programada» ya vencida en la especialidad de v_med (H-36)
  select id into p3 from public.profiles where role='patient' and id not in (p1, p2) order by created_at limit 1;
  select specialty_id into v_esp from public.doctors where id = v_med;
  delete from public.appointments where patient_id = p3 and status in ('scheduled','rescheduled');
  update public.profiles set eps_id = null where id = p3;
  insert into public.appointments (patient_id, doctor_id, slot_id, eps_id, specialty_id, mode, status)
    values (p3, v_med, s_pasado, v_eps, v_esp, 'presencial', 'scheduled');
  insert into public.availability_slots (doctor_id, date, start_time, end_time) values (v_med, current_date + 12, '08:00', '08:20') returning id into s_libre3;
  -- Modelo familiar (RF-13): otra EPS activa con un médico activo, y horarios futuros
  -- (a horas que la agenda simulada no genera, para no chocar con horarios reales)
  select d.eps_id, d.id into v_eps_fam, v_med_fam
    from public.doctors d join public.eps e on e.id = d.eps_id
   where d.active and e.active and d.eps_id <> v_eps order by d.id limit 1;
  insert into public.availability_slots (doctor_id, date, start_time, end_time) values (v_med_fam, current_date + 13, '05:11', '05:31') returning id into s_fam;
  insert into public.availability_slots (doctor_id, date, start_time, end_time) values (v_med, current_date + 14, '05:41', '06:01') returning id into s_libre4;
  delete from public.familiares where titular_id in (p1, p2);

  -- ── Pruebas (como pacientes autenticados) ──
  perform set_config('request.jwt.claims', json_build_object('sub',p1,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin v_cita := public.reservar_cita(s_libre, 'presencial', 'Control'); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T1 reserva válida', 'OK', resultado];

  perform set_config('request.jwt.claims', json_build_object('sub',p2,'role','authenticated')::text, true);
  begin perform public.reservar_cita(s_libre, 'presencial', null); resultado := 'OK (doble reserva)'; exception when others then resultado := sqlerrm; end;
  res := res || array['T2 otro paciente, mismo horario', 'HORARIO_NO_DISPONIBLE', resultado];
  begin perform public.reservar_cita(s_pasado, 'presencial', null); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T3 horario pasado', 'HORARIO_PASADO', resultado];
  begin perform public.reservar_cita(s_otra_eps, 'presencial', null); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T4 médico de otra EPS', 'EPS_NO_CORRESPONDE', resultado];
  begin perform public.reservar_cita(s_libre2, 'xyz', null); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T5 modalidad inválida (H-17)', 'MODALIDAD_INVALIDA', resultado];

  perform set_config('request.jwt.claims', json_build_object('sub',p1,'role','authenticated')::text, true);
  begin perform public.reservar_cita(s_libre2, 'presencial', null); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T6 segunda cita activa misma especialidad', 'CITA_DUPLICADA_ESPECIALIDAD', resultado];

  perform set_config('request.jwt.claims', json_build_object('sub',p2,'role','authenticated')::text, true);
  begin perform public.cancelar_cita(v_cita, null); resultado := 'OK (canceló ajena)'; exception when others then resultado := sqlerrm; end;
  res := res || array['T7 cancelar cita ajena', 'CITA_NO_EXISTE', resultado];
  begin update public.appointments set status='completed' where id = v_cita;
        resultado := case when found then 'MODIFICÓ' else 'BLOQUEADO' end;
  exception when others then resultado := 'BLOQUEADO'; end;
  res := res || array['T8 UPDATE directo sobre una cita (H-35b)', 'BLOQUEADO', resultado];

  perform set_config('request.jwt.claims', json_build_object('sub',p1,'role','authenticated')::text, true);
  begin perform public.reprogramar_cita(v_cita, s_libre2, 'telemedicina', null); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T9 reprogramar válido', 'OK', resultado];

  perform set_config('request.jwt.claims', json_build_object('sub',p2,'role','authenticated')::text, true);
  begin perform public.reservar_cita(s_libre, 'presencial', null); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T10 horario liberado vuelve a ser reservable (H-34)', 'OK', resultado];

  perform set_config('request.jwt.claims', json_build_object('sub',p1,'role','authenticated')::text, true);
  begin perform public.cancelar_cita(v_cita, 'Prueba'); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T11 cancelar con más de 24 h', 'OK', resultado];
  begin v_cita_cerca := public.reservar_cita(s_cerca, 'presencial', null);
        begin perform public.cancelar_cita(v_cita_cerca, null); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  exception when others then resultado := 'preparación: ' || sqlerrm; end;
  res := res || array['T12 cancelar con menos de 24 h, hora Bogotá (H-33)', 'FUERA_DE_PLAZO', resultado];

  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  begin perform public.reservar_cita(s_libre2, 'presencial', null); resultado := 'OK (reservó)';
  exception when insufficient_privilege then resultado := 'SIN PERMISO'; when others then resultado := sqlerrm; end;
  res := res || array['T13 visitante sin sesión intenta reservar', 'SIN PERMISO', resultado];
  execute 'reset role';

  -- ── EPS del perfil (H-37) ──
  perform set_config('request.jwt.claims', json_build_object('sub',p1,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform public.asignar_mi_eps(v_otra_eps); resultado := 'OK (cambió la EPS)'; exception when others then resultado := sqlerrm; end;
  res := res || array['T14 cambiar una EPS ya registrada (H-37)', 'EPS_YA_REGISTRADA', resultado];

  perform set_config('request.jwt.claims', json_build_object('sub',p3,'role','authenticated')::text, true);
  begin perform public.asignar_mi_eps(gen_random_uuid()); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T15 registrar una EPS que no existe (H-37)', 'EPS_INVALIDA', resultado];
  begin perform public.asignar_mi_eps(v_eps); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T16 registrar la EPS de un perfil que no la tiene (H-37)', 'OK', resultado];

  -- ── Citas vencidas (H-36) ──
  begin perform public.reservar_cita(s_libre3, 'presencial', null); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T17 una cita vencida no bloquea otra de la misma especialidad (H-36)', 'OK', resultado];

  -- ── Modelo familiar (RF-13) ──
  perform set_config('request.jwt.claims', json_build_object('sub',p1,'role','authenticated')::text, true);
  begin perform public.guardar_familiar('Samuel Prueba', 'TI', '1012345678', date '2015-05-10', 'hijo', v_eps, false); resultado := 'OK';
  exception when others then resultado := sqlerrm; end;
  res := res || array['T18 registrar familiar sin autorización (Ley 1581)', 'AUTORIZACION_REQUERIDA', resultado];
  begin perform public.guardar_familiar('Samuel Prueba', 'TI', '1012345678', current_date + 1, 'hijo', v_eps, true); resultado := 'OK';
  exception when others then resultado := sqlerrm; end;
  res := res || array['T19 fecha de nacimiento futura', 'FECHA_NACIMIENTO_INVALIDA', resultado];
  begin f1 := public.guardar_familiar('  Samuel   Prueba ', 'TI', '1012345678', date '2015-05-10', 'hijo', v_eps, true); resultado := 'OK';
  exception when others then resultado := sqlerrm; end;
  res := res || array['T20 registrar hijo con la misma EPS del titular', 'OK', resultado];
  begin perform public.guardar_familiar('Otro Nombre', 'TI', '1012345678', date '2016-01-01', 'hijo', v_eps, true); resultado := 'OK';
  exception when others then resultado := sqlerrm; end;
  res := res || array['T21 documento repetido en la familia', 'FAMILIAR_DUPLICADO', resultado];
  begin f2 := public.guardar_familiar('Gloria Prueba', 'CC', '41234567', date '1955-03-02', 'padre_madre', v_eps_fam, true); resultado := 'OK';
  exception when others then resultado := sqlerrm; end;
  res := res || array['T22 registrar madre con una EPS distinta a la del titular', 'OK', resultado];
  begin perform public.reservar_cita(s_libre4, 'presencial', null, f2); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T23 reservar para la madre con un médico de la EPS del titular', 'EPS_NO_CORRESPONDE', resultado];
  begin perform public.reservar_cita(s_fam, 'presencial', null, f2); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T24 reservar para la madre con un médico de su propia EPS', 'OK', resultado];
  -- El titular ya tiene una cita activa en esta especialidad (s_cerca): la regla es por persona.
  begin v_cita_f1 := public.reservar_cita(s_libre4, 'presencial', null, f1); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T25 una cita activa por especialidad y por persona (hijo y titular)', 'OK', resultado];

  perform set_config('request.jwt.claims', json_build_object('sub',p2,'role','authenticated')::text, true);
  begin perform public.reservar_cita(s_libre3, 'presencial', null, f1); resultado := 'OK (reservó para familiar ajeno)'; exception when others then resultado := sqlerrm; end;
  res := res || array['T26 reservar para el familiar de otra cuenta', 'FAMILIAR_NO_EXISTE', resultado];
  select count(*) into v_n from public.familiares where titular_id = p1;
  res := res || array['T27 otra cuenta no ve los familiares ajenos (RLS)', '0', v_n::text];

  perform set_config('request.jwt.claims', json_build_object('sub',p1,'role','authenticated')::text, true);
  begin perform public.retirar_familiar(f1); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T28 retirar a un familiar con citas próximas', 'FAMILIAR_CON_CITAS', resultado];
  begin perform public.cancelar_cita(v_cita_f1, null); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T29 el titular cancela la cita de su hijo', 'OK', resultado];
  begin perform public.retirar_familiar(f1); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T30 retirar a un familiar sin citas próximas', 'OK', resultado];
  begin insert into public.familiares (titular_id, nombre_completo, tipo_documento, numero_documento, fecha_nacimiento, parentesco, eps_id)
        values (p1, 'Directo Prueba', 'CC', '99999999', date '1990-01-01', 'otro', v_eps);
        resultado := 'INSERTÓ';
  exception when others then resultado := 'BLOQUEADO'; end;
  res := res || array['T31 escritura directa en la tabla de familiares', 'BLOQUEADO', resultado];
  execute 'reset role';

  -- ── Interoperabilidad FHIR (ADR-0009): outbox transaccional ──
  -- v_cita se reservó (T1), se reprogramó de s_libre a s_libre2 (T9) y se canceló (T11).
  select count(*) into v_n from private.fhir_outbox where id_local = v_cita;
  res := res || array['T32 reservar, reprogramar y cancelar dejan un evento cada uno en la outbox', '3', v_n::text];
  select coalesce(string_agg(franja_anterior::text, ','), 'ninguna') into resultado
    from private.fhir_outbox where id_local = v_cita and franja_anterior is not null;
  res := res || array['T33 la reprogramación registra la franja que se libera', s_libre::text, resultado];
  update public.appointments set notes = 'Solo cambia la nota' where id = v_cita;
  select count(*) into v_n from private.fhir_outbox where id_local = v_cita;
  res := res || array['T34 cambiar solo las notas no genera evento (no viajan a FHIR)', '3', v_n::text];

  perform set_config('request.jwt.claims', json_build_object('sub',p1,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  begin perform count(*) from private.fhir_outbox; resultado := 'LEYÓ';
  exception when insufficient_privilege then resultado := 'SIN PERMISO'; when others then resultado := sqlerrm; end;
  res := res || array['T35 un paciente no puede leer la outbox', 'SIN PERMISO', resultado];
  begin perform public.fhir_tomar_eventos('https://prueba.invalid/fhir', 5); resultado := 'EJECUTÓ';
  exception when insufficient_privilege then resultado := 'SIN PERMISO'; when others then resultado := sqlerrm; end;
  res := res || array['T36 un paciente no puede tomar eventos de la outbox', 'SIN PERMISO', resultado];
  begin perform public.admin_fhir_resumen(); resultado := 'OK'; exception when others then resultado := sqlerrm; end;
  res := res || array['T37 un paciente no ve el panel de interoperabilidad', 'NO_AUTORIZADO', resultado];
  execute 'reset role';

  -- Lo que recibe la Edge Function: la cita seudonimizada, con la franja liberada y sin datos personales.
  select e into v_evento
    from jsonb_array_elements(public.fhir_tomar_eventos('https://prueba.invalid/fhir', 100)) as e
   where e->'cita'->>'id' = v_cita::text;
  select p.cedula, p.full_name into v_cedula, v_nombre from public.profiles p where p.id = p1;
  resultado := case
    when v_evento is null then 'SIN EVENTO'
    when (v_evento->'cita'->'paciente'->>'seudonimo') !~ '^[0-9a-f]{64}$' then 'SIN SEUDÓNIMO'
    when position(v_nombre in v_evento::text) > 0
      or (length(v_cedula) >= 6 and position(v_cedula in v_evento::text) > 0) then 'CON DATOS PERSONALES'
    when jsonb_array_length(v_evento->'cita'->'franjasAnteriores') <> 1
      or v_evento->'cita'->'franjasAnteriores'->0->>'id' <> s_libre::text then 'SIN FRANJA LIBERADA'
    else 'OK' end;
  res := res || array['T38 la outbox entrega la cita seudonimizada, sin cédula ni nombre y con la franja liberada', 'OK', resultado];

  -- ── Informe y reversión ──
  resultado := '';
  for i in 1 .. array_length(res, 1) / 3 loop
    total := total + 1;
    if res[3*i-1] = res[3*i] then pasan := pasan + 1; end if;
    resultado := resultado || E'\n' || case when res[3*i-1] = res[3*i] then 'PASA  | ' else 'FALLA | ' end
      || res[3*i-2] || ' | esperado=' || res[3*i-1] || ' | obtenido=' || res[3*i];
  end loop;
  raise exception E'RESULTADO: % de % pruebas pasan (transacción revertida)%', pasan, total, resultado;
end $$;
