-- Minimal Supabase surface for payments migration tests on plain PostgreSQL.
-- Roles + a Vault-compatible schema (create_secret/update_secret/decrypted_secrets).
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;

create schema if not exists vault;
create table if not exists vault.secrets(
  id uuid primary key default gen_random_uuid(),
  name text unique,
  description text,
  secret text not null
);
create or replace function vault.create_secret(new_secret text, new_name text default null, new_description text default '')
returns uuid language sql as $$
  insert into vault.secrets(name,description,secret) values(new_name,new_description,new_secret) returning id
$$;
create or replace function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null)
returns void language sql as $$
  update vault.secrets set secret=coalesce(new_secret,secret) where id=secret_id
$$;
create or replace view vault.decrypted_secrets as
  select id, name, description, secret, secret as decrypted_secret from vault.secrets;
revoke all on schema vault from anon, authenticated, service_role;
