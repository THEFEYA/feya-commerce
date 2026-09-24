import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
export const variantFixture = async () => JSON.parse(await readFile(new URL('../fixtures/observed-variant-dependencies-20260924.json', import.meta.url), 'utf8'));
export const variantMigrationSQL = () => readFile(new URL('../../../supabase/migrations/20260924173914_product_variant_draft_atomic_v1.sql', import.meta.url), 'utf8');
const q = s => '"' + s.replaceAll('"', '""') + '"';

/** Observed public FK closure; existing runtime tables retain their earlier SELECT fixture.
 * PGlite uses native SHA256 for digest compatibility; real PostgreSQL uses pgcrypto. */
export async function variantDependenciesSQL({ existing = [], pglite = false } = {}) {
  const f = await variantFixture(), names = new Set(existing), sql = [];
  sql.push(`create schema if not exists auth; create schema if not exists extensions;
    do $$ begin
      if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
      if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
      if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
    end $$;
    create table if not exists auth.users(id uuid primary key);
    grant usage on schema public to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
    alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`);
  if (pglite) sql.push(`create function extensions.digest(b bytea,algorithm text) returns bytea language sql immutable as $$ select case when algorithm='sha256' then sha256(b) else null end $$;`);
  else sql.push('create extension if not exists pgcrypto with schema extensions;');
  const tables = f.tables.filter(t => !names.has(t.name));
  for (const t of tables) {
    assert.ok(t.columns.every(c => !c.identity && !c.generated && !c.default?.includes('nextval(')));
    sql.push(`create table public.${q(t.name)}(${t.columns.map(c => q(c.name)+' '+c.type+(c.default?' default '+c.default:'')+(c.not_null?' not null':'')).join(',')});`);
  }
  for (const foreign of [false, true]) for (const t of tables) for (const c of t.constraints) {
    if ((c.type === 'f') !== foreign) continue;
    assert.ok(c.foreign_schema === null || c.foreign_schema === 'public' || (c.foreign_schema === 'auth' && c.foreign_table === 'users'));
    sql.push(`alter table public.${q(t.name)} add constraint ${q(c.name)} ${c.definition};`);
  }
  for (const fn of [...f.governance.functions, ...f.canonical_functions]) sql.push(fn.definition+';');
  for (const t of tables) {
    for (const index of t.indexes) sql.push(index+';');
    for (const trigger of t.triggers) sql.push(trigger.definition+';');
    if (t.rls) sql.push(`alter table public.${q(t.name)} enable row level security;`);
    sql.push(`revoke all on public.${q(t.name)} from public,anon,authenticated; grant select,insert,update,delete on public.${q(t.name)} to service_role;`);
  }
  return sql.join('\n');
}

export const variantTestIds = {
  product: '10000000-0000-4000-8000-000000000041', otherProduct: '10000000-0000-4000-8000-000000000042',
  parent: '20000000-0000-4000-8000-000000000041', config: '30000000-0000-4000-8000-000000000041',
  gold: '40000000-0000-4000-8000-000000000041', silver: '40000000-0000-4000-8000-000000000042',
  variant: '50000000-0000-4000-8000-000000000041', secondVariant: '50000000-0000-4000-8000-000000000042',
  quote: '60000000-0000-4000-8000-000000000041',
};
export async function seedVariantProduct(db) {
  const i = variantTestIds;
  await db.query("insert into public.feya_commerce_shops(shop_code,shop_name) values ('variant-test','Synthetic variant fixtures') on conflict do nothing");
  await db.query(`insert into public.feya_commerce_product_drafts(canonical_product_id,source_shop_code) values($1,'variant-test'),($2,'variant-test')`,[i.product,i.otherProduct]);
  await db.query(`insert into public.feya_commerce_sellable_configurations(sellable_configuration_id,canonical_product_id,configuration_name,normalized_key) values($1,$2,'Synthetic Full Set','synthetic-full-set')`,[i.parent,i.product]);
  await db.query(`insert into public.feya_commerce_configuration_prices(configuration_price_id,canonical_product_id,sellable_configuration_id,source_amount,source_currency,public_price_amount,review_status,price_status) values($1,$2,$3,123.45,'EUR',123.45,'not_reviewed','draft')`,[i.config,i.product,i.parent]);
}
export function variantDraftRequest(context, requestId) {
  const i = variantTestIds;
  return { contract_version:'product_variant_draft_v1', request_id:requestId, expected_revision:context.current_revision,
    source_bindings:context.source_bindings,
    snapshot:context.snapshot ? { ...structuredClone(context.snapshot), product_revision:context.current_revision+1 } : {
      canonical_product_id:i.product,product_revision:1,pricing_policy_ref:'owner-configuration-base-price-20260924-04',
      configurations:[{configuration_price_id:i.config,sellable_configuration_id:i.parent,
        base_price:{quote_id:i.quote,price_revision:1,status:'unverified',amount_minor:12345,currency:'EUR',evidence_ref:'synthetic-source-only'}}],
      colors:[{id:i.gold,label:'Gold',state:'confirmed'}],sizes:[],
      variants:[{variant_id:i.variant,configuration_price_id:i.config,color_id:i.gold,size_id:null,state:'draft',pricing:{mode:'configuration_base'}}],
    } };
}
