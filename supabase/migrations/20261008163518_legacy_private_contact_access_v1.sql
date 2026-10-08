-- Close observed legacy browser access without reading or rewriting private data.
begin;
do $$
declare target text; relation oid; object_kind "char"; permission text; column_name text; columns_sql text;
  permissions text[] := array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'];
  table_before jsonb; columns_before jsonb; column_permissions jsonb; allowed boolean; browser_role text;
  creator regprocedure; service_creator_allowed boolean;
begin
  if current_setting('server_version_num')::int>=170000 then permissions:=permissions||array['MAINTAIN']; end if;
  if not exists(select 1 from pg_catalog.pg_roles where rolname='service_role' and rolbypassrls)
    then raise exception 'legacy_private_backend_role_not_ready'; end if;
  foreach target in array array['public.dashboard_tokens','feya_sales.contacts','feya_sales.lead_contacts'] loop
    relation:=to_regclass(target);
    if relation is null then continue; end if; -- Legacy objects are absent on a new installation.
    select relkind into object_kind from pg_catalog.pg_class where oid=relation;
    if object_kind not in ('r','p') then raise exception 'legacy_private_relation_type_changed'; end if;
    select jsonb_object_agg(p,has_table_privilege('service_role',relation,p)) into table_before from unnest(permissions) p;
    select jsonb_object_agg(a.attname,jsonb_build_object(
      'SELECT',has_column_privilege('service_role',relation,a.attnum,'SELECT'),
      'INSERT',has_column_privilege('service_role',relation,a.attnum,'INSERT'),
      'UPDATE',has_column_privilege('service_role',relation,a.attnum,'UPDATE'),
      'REFERENCES',has_column_privilege('service_role',relation,a.attnum,'REFERENCES'))),
      string_agg(format('%I',a.attname),',' order by a.attnum)
      into columns_before,columns_sql from pg_catalog.pg_attribute a where a.attrelid=relation and a.attnum>0 and not a.attisdropped;
    execute format('alter table %s enable row level security',relation::regclass);
    execute format('revoke all privileges on table %s from public,anon,authenticated',relation::regclass);
    if columns_sql is not null then execute format('revoke all privileges (%s) on table %s from public,anon,authenticated',columns_sql,relation::regclass); end if;
    -- Revoking PUBLIC also affects service_role inheritance. Preserve only its
    -- previous effective rights; do not invent new backend capabilities.
    foreach permission in array permissions loop
      if (table_before->>permission)::boolean then execute format('grant %s on table %s to service_role',permission,relation::regclass); end if;
    end loop;
    for column_name,column_permissions in select key,value from jsonb_each(coalesce(columns_before,'{}')) loop
      foreach permission in array array['SELECT','INSERT','UPDATE','REFERENCES'] loop
        if (column_permissions->>permission)::boolean and not (table_before->>permission)::boolean
          then execute format('grant %s (%I) on table %s to service_role',permission,column_name,relation::regclass); end if;
        if has_column_privilege('service_role',relation,column_name,permission) is distinct from (column_permissions->>permission)::boolean
          then raise exception 'legacy_private_backend_column_access_changed'; end if;
      end loop;
    end loop;
    foreach permission in array permissions loop
      if has_table_privilege('service_role',relation,permission) is distinct from (table_before->>permission)::boolean
        then raise exception 'legacy_private_backend_access_changed'; end if;
    end loop;
    foreach browser_role in array array['anon','authenticated'] loop
      if has_table_privilege(browser_role,relation,array_to_string(permissions,','))
        or has_any_column_privilege(browser_role,relation,'SELECT,INSERT,UPDATE,REFERENCES')
        then raise exception 'legacy_private_browser_access_still_open'; end if;
    end loop;
  end loop;
  creator:=to_regprocedure('gen.create_dashboard_token(integer,text)');
  if creator is not null then
    service_creator_allowed:=has_function_privilege('service_role',creator,'EXECUTE');
    execute format('revoke all on function %s from public,anon,authenticated',creator);
    if service_creator_allowed then execute format('grant execute on function %s to service_role',creator); end if;
    if has_function_privilege('anon',creator,'EXECUTE') or has_function_privilege('authenticated',creator,'EXECUTE')
      or has_function_privilege('service_role',creator,'EXECUTE') is distinct from service_creator_allowed
      then raise exception 'legacy_private_token_creator_access_changed'; end if;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
