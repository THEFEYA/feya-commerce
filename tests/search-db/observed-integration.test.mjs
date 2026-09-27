import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { observedSchemaSQL, migrationSQL } from './helpers/observed-schema.mjs';
import { reviewFlowFixture } from '../seo/helpers/review-flow-fixture.ts';
import { normalizeReviewDraftForSeoPack } from '../../lib/seoReviewDraftNormalization.ts';
import { stampCurrentSeoEditorialPolicy } from '../../lib/seoEditorialPolicy.ts';
import { validateSeoReviewDraft } from '../../lib/seoReviewDraftValidation.ts';
import { buildSeoDraftStoragePayload } from '../../lib/seoDraftStoragePayload.ts';
import { buildSavedDraftPreviewResult } from '../../lib/seoSavedDraftPreview.ts';
import { insertSeoDraftWithEvent, seoDraftRequestKey } from '../../lib/seoDraftAtomicStorage.ts';

const nativeURL = process.env.FEYA_TEST_DATABASE_URL;
let db, nativeClient, historical, payload, saved;
const hub = '00000000-0000-4000-8000-000000000001';
const snapshot = '00000000-0000-4000-8000-000000000002';
const product = '00000000-0000-4000-8000-000000000021';
const saveSQL = 'select public.feya_commerce_save_seo_review_draft_v1($1,$2::jsonb) as result';
const count = async table => (await db.query(`select count(*)::int n from public.${table}`)).rows[0].n;

async function connectNative() {
  // Dedicated, empty, loopback-only CI database. Never accepts the production URL.
  const url = new URL(nativeURL);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert.equal(url.pathname, '/feya_test');
  const client = new pg.Client({ connectionString: nativeURL, application_name: 'feya-isolated-tests', statement_timeout: 15000, connectionTimeoutMillis: 5000 });
  await client.connect();
  return client;
}

before(async () => {
  if (nativeURL) {
    nativeClient = await connectNative();
    db = { query: (sql, values) => nativeClient.query(sql, values), exec: sql => nativeClient.query(sql), close: () => nativeClient.end() };
    assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname in ('public','auth')")).rows[0].n, 0, 'Refuse a nonempty database');
  } else db = await PGlite.create();
  await db.exec(await observedSchemaSQL());
  historical = JSON.parse(await readFile(new URL('../seo/fixtures/historical-approved-draft-20260923.json', import.meta.url), 'utf8'));
  await db.query(`insert into public.feya_commerce_seo_pack_drafts_v1(id,canonical_product_id,status,review_status,source_mode,agent_output_snapshot,validation_result_snapshot)
    values($1,$2,$3,$4,$5,$6,$7)`, [historical.id,historical.canonical_product_id,historical.status,historical.review_status,historical.source_mode,historical.agent_output_snapshot,historical.validation_result_snapshot]);
  await db.exec(`insert into public.feya_commerce_shops(shop_code,shop_name) values ('test','Synthetic transaction fixtures');
    insert into public.feya_commerce_product_drafts(canonical_product_id,source_shop_code) values ('${product}','test');
    insert into public.feya_commerce_seo_pages_v1(seo_page_id,page_type,url_path) values ('${hub}','landing','/synthetic-test');`);
  await db.exec(await migrationSQL());
  const f = reviewFlowFixture();
  const output = stampCurrentSeoEditorialPolicy(normalizeReviewDraftForSeoPack(f.candidate, f.draft));
  const validationResult = validateSeoReviewDraft(output, f.draft);
  assert.equal(validationResult.ok, true, JSON.stringify(validationResult.issues));
  payload = buildSeoDraftStoragePayload({seoPackDraft:f.draft,agentInput:f.agentInput,agentOutput:output,validationResult,sourceMode:'human_edit',createdBy:'isolated-test'});
});
after(async () => { await db?.close(); });

async function asService(fn) { await db.exec('set role service_role'); try { return await fn(); } finally { await db.exec('reset role'); } }
async function save(value = payload, key = seoDraftRequestKey(value), client = db) {
  return (await client.query(saveSQL, [key, JSON.stringify(value)])).rows[0].result;
}

// SQL transport adapter tests the actual production RPC caller + SQL body without claiming PostgREST/Auth E2E.
const transport = { rpc: async (name, args) => {
  assert.equal(name, 'feya_commerce_save_seo_review_draft_v1');
  try { return { data: await asService(() => save(args.p_payload, args.p_request_key)), error: null }; }
  catch (error) { return { data: null, error }; }
}};

test('observed dependencies migrate without changing historical approved copy or canonical IDs', async () => {
  const row = (await db.query('select * from public.feya_commerce_seo_pack_drafts_v1 where id=$1', [historical.id])).rows[0];
  assert.deepEqual(row.agent_output_snapshot, historical.agent_output_snapshot);
  assert.deepEqual(row.validation_result_snapshot, historical.validation_result_snapshot);
  assert.equal(row.review_status, 'approved');
  const preview = buildSavedDraftPreviewResult(row);
  assert.equal(preview.generated_draft_output.editorial_policy_version, undefined);
  assert.equal(preview.openai_generation.total_tokens, 0);
  assert.equal(preview.saved_draft.id, historical.id);
  assert.equal(await count('feya_commerce_product_drafts'), 1);
});

test('broad inherited grants cannot expose search evidence, receipts, or save RPC', async () => {
  const tables = (await db.query("select relname, relrowsecurity from pg_class where relkind='r' and (relname like 'feya_search_%' or relname='feya_commerce_seo_draft_save_receipts_v1')")).rows;
  assert.equal(tables.length, 6);
  for (const table of tables) {
    assert.equal(table.relrowsecurity, true);
    for (const role of ['anon','authenticated']) {
      const r = await db.query('select has_table_privilege($1,$2,$3) as allowed', [role, `public.${table.relname}`, 'SELECT,INSERT,UPDATE,DELETE']);
      assert.equal(r.rows[0].allowed, false);
    }
  }
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    try { await assert.rejects(save(payload, 'a'.repeat(64)), /permission denied/); }
    finally { await db.exec('reset role'); }
  }
  const f = (await db.query("select prosecdef, proconfig from pg_proc where proname='feya_commerce_save_seo_review_draft_v1'")).rows[0];
  assert.equal(f.prosecdef, false);
  assert.ok(f.proconfig.includes('search_path=""'));
});

test('real validators → atomic save → latest view → preview preserve review-only state', async () => {
  saved = await insertSeoDraftWithEvent(transport, payload);
  assert.equal(saved.ok, true, saved.error);
  assert.equal(saved.httpStatus, 201);
  const row = (await db.query('select * from public.feya_commerce_v_seo_pack_drafts_latest_v1 where canonical_product_id=$1', [product])).rows[0];
  const preview = buildSavedDraftPreviewResult(row);
  assert.equal(preview.saved_draft.id, saved.draft.id);
  assert.equal(saved.event.draft_id, saved.draft.id);
  assert.equal(preview.generated_draft_commercial_validation.editorial_policy_version, 'brand_mission_v2');
  assert.equal(preview.generated_draft_validation.ok, true);
  assert.equal(preview.assembled_seo_pack.quality_gate.ready_for_publish, false);
  assert.equal(preview.assembled_seo_pack.apply.status, 'blocked_until_approval');
  assert.equal(preview.saved_draft.review_status, 'not_reviewed');
  assert.equal(preview.openai_generation.writer_calls, 0);
});

test('identical retries reuse stable draft/event IDs; explicit conflicting retry returns 409', async () => {
  const again = await insertSeoDraftWithEvent(transport, payload);
  assert.equal(again.httpStatus, 200);
  assert.equal(again.draft.id, saved.draft.id);
  assert.equal(again.event.id, saved.event.id);
  const first = await insertSeoDraftWithEvent(transport, payload, 'operator-retry-0001');
  const conflict = await insertSeoDraftWithEvent(transport, {...payload, intro:'Changed payload'}, 'operator-retry-0001');
  assert.equal(first.ok, true);
  assert.equal(conflict.httpStatus, 409);
  assert.equal(conflict.draft, null);
});

test('injected history-write failure rolls back draft AND receipt and allows a clean retry', async () => {
  const beforeDrafts = await count('feya_commerce_seo_pack_drafts_v1');
  const beforeReceipts = await count('feya_commerce_seo_draft_save_receipts_v1');
  await db.exec(`create function public.test_reject_event() returns trigger language plpgsql as $$ begin raise exception 'injected event failure'; end $$;
    create trigger test_event_failure before insert on public.feya_commerce_seo_pack_draft_events_v1 for each row execute function public.test_reject_event();`);
  try {
    const failed = await insertSeoDraftWithEvent(transport, payload, 'event-failure-0001');
    assert.equal(failed.ok, false);
    assert.match(failed.error, /injected event failure/);
    assert.equal(failed.draft, null);
    assert.equal(await count('feya_commerce_seo_pack_drafts_v1'), beforeDrafts);
    assert.equal(await count('feya_commerce_seo_draft_save_receipts_v1'), beforeReceipts);
  } finally { await db.exec('drop trigger test_event_failure on public.feya_commerce_seo_pack_draft_events_v1; drop function public.test_reject_event();'); }
  assert.equal((await insertSeoDraftWithEvent(transport, payload, 'event-failure-0001')).httpStatus, 201);
});

test('RPC rejects approval/publish injections, unknown fields, failing validation and legacy policy', async () => {
  for (const patch of [
    {status:'published'}, {review_status:'approved'}, {reviewer:'injected'},
    {validation_result_snapshot:{...payload.validation_result_snapshot,ok:false}},
    {agent_output_snapshot:{...payload.agent_output_snapshot,editorial_policy_version:'legacy_v1'}},
    {validation_result_snapshot:{...payload.validation_result_snapshot,assembled_seo_pack:{quality_gate:{ready_for_publish:true},apply:{status:'blocked_until_approval'}}}},
  ]) await asService(() => assert.rejects(save({...payload,...patch}), /Only validated|Unsupported draft/));
});

test('receipt is immutable to service role; historical approvals are not reset by a replay', async () => {
  await asService(() => assert.rejects(db.query('update public.feya_commerce_seo_draft_save_receipts_v1 set payload_sha256=$1', ['0'.repeat(64)]), /permission denied/));
  await db.query("update public.feya_commerce_seo_pack_drafts_v1 set status='approved_draft',review_status='approved' where id=$1", [saved.draft.id]);
  const replay = await insertSeoDraftWithEvent(transport, payload);
  assert.equal(replay.draft.review_status, 'approved');
  assert.equal(replay.draft.id, saved.draft.id);
});

test('incomplete search evidence fails at commit and cannot leave an orphan snapshot', async () => {
  await db.exec('begin; set local role service_role');
  await db.query(`insert into public.feya_search_membership_snapshots_v1(membership_snapshot_id,seo_page_id,rule_version,source_revision,expected_item_count) values ($1,$2,'test','test',1)`, [snapshot,hub]);
  try { await assert.rejects(db.exec('commit'), /Incomplete/); } finally { await db.exec('rollback; reset role'); }
  assert.equal(await count('feya_search_membership_snapshots_v1'), 0);
  await db.exec(`begin; set local role service_role;
    insert into public.feya_search_membership_snapshots_v1(membership_snapshot_id,seo_page_id,rule_version,source_revision,expected_item_count) values ('${snapshot}','${hub}','test','test',1);
    insert into public.feya_search_membership_items_v1(membership_snapshot_id,canonical_product_id,eligibility_status) values ('${snapshot}','${product}','unknown'); commit;`);
  await assert.rejects(db.exec(`update public.feya_search_membership_snapshots_v1 set expected_item_count=0 where membership_snapshot_id='${snapshot}'`), /immutable/);
});

test('native PostgreSQL: eight concurrent retries commit one draft and one event', {skip: !nativeURL}, async () => {
  const clients = await Promise.all(Array.from({length:8}, () => connectNative()));
  try {
    await Promise.all(clients.map(c => c.query('set role service_role')));
    const rows = await Promise.all(clients.map(c => save(payload, 'd'.repeat(64), c)));
    assert.equal(new Set(rows.map(r => r.draft.id)).size, 1);
    assert.equal(new Set(rows.map(r => r.event.id)).size, 1);
    assert.equal(rows.filter(r => !r.replayed).length, 1);
  } finally { await Promise.all(clients.map(c => c.end())); }
});

test('native PostgreSQL: conflicting concurrent saves cannot overwrite the winning payload', {skip: !nativeURL}, async () => {
  const clients = await Promise.all([connectNative(),connectNative()]);
  try {
    await Promise.all(clients.map(c => c.query('set role service_role')));
    const results = await Promise.allSettled(clients.map((c,i) => save({...payload,intro:`Concurrent ${i}`}, 'e'.repeat(64), c)));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    const error = results.find(r => r.status === 'rejected').reason;
    assert.equal(error.code, '23505');
  } finally { await Promise.all(clients.map(c => c.end())); }
});

test('native PostgreSQL: competing page versions have one winner and retain immutable evidence', {skip: !nativeURL}, async () => {
  const clients = await Promise.all([connectNative(),connectNative()]);
  try {
    await Promise.all(clients.map(c => c.query('set role service_role')));
    const sql = `insert into public.feya_search_page_versions_v1(seo_page_id,version_number,membership_snapshot_id,content_hash,spec_json,content_json) values ($1,1,$2,$3,'{}','{}') returning page_version_id`;
    const results = await Promise.allSettled(clients.map(c => c.query(sql,[hub,snapshot,'f'.repeat(64)])));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.find(r => r.status === 'rejected').reason.code, '23505');
    await assert.rejects(db.query('update public.feya_search_page_versions_v1 set content_hash=$1', ['a'.repeat(64)]), /immutable/);
  } finally { await Promise.all(clients.map(c => c.end())); }
});
