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
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  p1 uuid; p2 uuid; v_eps uuid; v_otra_eps uuid; v_med uuid; v_med_otra uuid;
  s_libre uuid; s_libre2 uuid; s_pasado uuid; s_cerca uuid; s_otra_eps uuid;
  v_cita uuid; v_cita_cerca uuid;
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
