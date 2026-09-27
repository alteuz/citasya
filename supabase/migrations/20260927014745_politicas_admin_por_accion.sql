-- Políticas de escritura del administrador separadas por acción (H-26).
-- Con FOR ALL, la política de administración también aplicaba a SELECT y se
-- evaluaba junto a la de lectura (dos políticas permisivas por consulta).
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('eps',                'eps_admin_escritura'),
      ('specialties',        'especialidades_admin_escritura'),
      ('doctors',            'medicos_admin_escritura'),
      ('availability_slots', 'horarios_admin_escritura'),
      ('appointments',       'citas_admin_escritura'),
      ('notifications',      'notificaciones_admin_escritura')
    ) as v(tabla, politica)
  loop
    execute format('drop policy if exists %I on public.%I', t.politica, t.tabla);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.es_admin()))',
      t.politica || '_insert', t.tabla);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.es_admin())) with check ((select private.es_admin()))',
      t.politica || '_update', t.tabla);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.es_admin()))',
      t.politica || '_delete', t.tabla);
  end loop;
end $$;
