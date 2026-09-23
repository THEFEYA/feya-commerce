import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Real PostgreSQL semantics in WASM; these minimal parent fixtures represent
// observed existing keys, not a substitute for a full Supabase staging restore.
let db;
const hub = '00000000-0000-4000-8000-000000000001';
const product = '00000000-0000-4000-8000-000000000002';
const other = '00000000-0000-4000-8000-000000000003';
const snapshot = '00000000-0000-4000-8000-000000000004';
before(async () => {
  db = await PGlite.create();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create table public.feya_commerce_product_drafts(canonical_product_id uuid primary key);
    create table public.feya_commerce_seo_pages_v1(seo_page_id uuid primary key, page_type text not null);
    create table public.feya_growth_execution_requests_v1(execution_request_id uuid primary key);
    create table public.feya_growth_change_events_v1(change_event_id uuid primary key);
    grant select on all tables in schema public to service_role;
    insert into public.feya_commerce_seo_pages_v1 values ('${hub}', 'landing'), ('${product}', 'product'), ('${other}', 'landing');
    insert into public.feya_commerce_product_drafts values ('${product}'), ('${other}');
  `);
  await db.exec(await readFile(new URL('../../supabase/migrations/20260923205841_search_portfolio_foundation_v1.sql', import.meta.url), 'utf8'));
});
after(async () => { await db?.close(); });

async function fails(sql, pattern) {
  await assert.rejects(db.exec(sql), pattern);
  // Errors may leave a user transaction aborted; reset role after rollback.
  await db.exec('rollback; reset role;');
}

test('additive migration leaves existing canonical rows intact and RLS covers all five tables', async () => {
  assert.equal((await db.query('select count(*)::int n from public.feya_commerce_seo_pages_v1')).rows[0].n, 3);
  const tables = await db.query("select relname, relrowsecurity from pg_class where relname like 'feya_search_%_v1' and relkind = 'r'");
  assert.equal(tables.rows.length, 5);
  assert.ok(tables.rows.every(row => row.relrowsecurity));
});
test('anonymous and authenticated sessions cannot read private evidence', async () => {
  for (const role of ['anon', 'authenticated']) await fails(`set role ${role}; select * from public.feya_search_page_specs_v1;`, /permission denied/);
});
test('family mismatches and self-parent links are rejected', async () => {
  await fails(`insert into public.feya_search_page_specs_v1(seo_page_id,family,accountable_owner) values ('${hub}','product','SCO');`, /conflicts/);
  await fails(`insert into public.feya_search_page_specs_v1(seo_page_id,family,accountable_owner,primary_parent_page_id) values ('${hub}','type_hub','SCO','${hub}');`, /check constraint/);
});
test('service role can create private drafts without approving or publishing them', async () => {
  await db.exec(`set role service_role; insert into public.feya_search_page_specs_v1(seo_page_id,family,accountable_owner) values ('${hub}','type_hub','SCO'); reset role;`);
  assert.equal((await db.query('select review_state from public.feya_search_page_specs_v1')).rows[0].review_state, 'draft');
});
test('incomplete snapshots fail at commit', async () => {
  await fails(`begin; insert into public.feya_search_membership_snapshots_v1(membership_snapshot_id,seo_page_id,rule_version,source_revision,expected_item_count) values ('${snapshot}','${hub}','rule-1','truth-1',1); commit;`, /Incomplete/);
  assert.equal((await db.query('select count(*)::int n from public.feya_search_membership_snapshots_v1')).rows[0].n, 0);
});
test('service role inserts a complete snapshot atomically', async () => {
  await db.exec(`begin; set local role service_role;
    insert into public.feya_search_membership_snapshots_v1(membership_snapshot_id,seo_page_id,rule_version,source_revision,expected_item_count) values ('${snapshot}','${hub}','rule-1','truth-1',1);
    insert into public.feya_search_membership_items_v1(membership_snapshot_id,canonical_product_id,design_family_key,eligibility_status,orderability_status,truth_version) values ('${snapshot}','${product}','one-design','eligible','confirmed','truth-1');
    commit;`);
  assert.equal((await db.query('select count(*)::int n from public.feya_search_membership_items_v1')).rows[0].n, 1);
});
test('committed snapshots cannot receive later items or duplicate products', async () => {
  await fails(`insert into public.feya_search_membership_items_v1(membership_snapshot_id,canonical_product_id,eligibility_status) values ('${snapshot}','${other}','unknown');`, /Incomplete or changed/);
  await fails(`insert into public.feya_search_membership_items_v1(membership_snapshot_id,canonical_product_id,eligibility_status) values ('${snapshot}','${product}','unknown');`, /duplicate key/);
});
test('snapshot and membership updates/deletes are blocked even for table owner', async () => {
  await fails(`update public.feya_search_membership_snapshots_v1 set expected_item_count=2;`, /immutable/);
  await fails(`delete from public.feya_search_membership_items_v1;`, /immutable/);
});
test('versions cannot reference another page snapshot and require existing Growth IDs', async () => {
  const values = `'${other}',1,'${snapshot}',repeat('a',64),'{}','{}'`;
  await fails(`insert into public.feya_search_page_versions_v1(seo_page_id,version_number,membership_snapshot_id,content_hash,spec_json,content_json) values (${values});`, /foreign key/);
  await fails(`insert into public.feya_search_page_versions_v1(seo_page_id,version_number,content_hash,spec_json,content_json,execution_request_id) values ('${hub}',1,repeat('a',64),'{}','{}','${other}');`, /foreign key/);
});
test('immutable version numbering and least-privilege service grants are enforced', async () => {
  await db.exec(`set role service_role; insert into public.feya_search_page_versions_v1(seo_page_id,version_number,membership_snapshot_id,content_hash,spec_json,content_json) values ('${hub}',1,'${snapshot}',repeat('a',64),'{}','{}'); reset role;`);
  await fails(`update public.feya_search_page_versions_v1 set content_json='{"changed":true}';`, /immutable/);
  await fails(`set role service_role; delete from public.feya_search_page_versions_v1;`, /permission denied/);
  await fails(`insert into public.feya_search_page_versions_v1(seo_page_id,version_number,content_hash,spec_json,content_json) values ('${hub}',1,repeat('b',64),'{}','{}');`, /duplicate key/);
});
