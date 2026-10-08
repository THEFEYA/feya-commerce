import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { variantDependenciesSQL, variantMigrationSQL, seedVariantProduct, prepareVariantIdentity, commerceQuoteMigrationSQL, seedApprovedOfferProjection, variantTestIds } from './helpers/commerce-quote.mjs';
import { emptyDeliveryWorkspace } from '../../lib/commerceDeliveryWorkspace.ts';
import { syntheticDeliveryWorkspace } from '../fixtures/commerceDeliveryWorkspace.ts';
import { deliveryApprovalReadiness } from '../../lib/commerceDeliveryApproval.ts';
import { resolveApprovedDelivery, APPROVED_DELIVERY_RESOLUTION } from '../../lib/commerceApprovedDeliveryResolution.ts';

const actor = '70000000-0000-4000-8000-000000000041', otherActor = '70000000-0000-4000-8000-000000000042';
const nativeURL = process.env.FEYA_TEST_DATABASE_URL;
if (nativeURL) {
  const u = new URL(nativeURL);
  assert.ok(['localhost', '127.0.0.1'].includes(u.hostname)); assert.equal(u.pathname, '/feya_test');
}
let db;
const migration = () => readFile(new URL('../../supabase/migrations/20261007211548_commerce_delivery_workspace_draft_v1.sql', import.meta.url), 'utf8');
async function connect() { const c = new pg.Client({ connectionString: nativeURL, statement_timeout: 15000, connectionTimeoutMillis: 5000 }); await c.connect(); return c; }
before(async () => {
  if (nativeURL) { const c = await connect(); db = { query: (s, p) => c.query(s, p), exec: s => c.query(s), close: () => c.end() }; assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n, 0); }
  else db = new PGlite();
  await db.exec(await variantDependenciesSQL({ pglite: !nativeURL }));
  await db.query('insert into auth.users(id) values($1),($2)', [actor, otherActor]);
  await seedVariantProduct(db); await db.exec(await variantMigrationSQL()); await prepareVariantIdentity(db, actor);
  await db.exec(await commerceQuoteMigrationSQL());
  const offer = await seedApprovedOfferProjection(db, {});
  await db.query('insert into public.feya_commerce_offer_heads_v1(canonical_product_id,current_offer_revision_id) values($1,$2)', [variantTestIds.product, offer.offerRevisionId]);
  await db.exec(await migration());
  await db.exec(await readFile(new URL('../../supabase/migrations/20261008083213_commerce_delivery_approval_v1.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../../supabase/migrations/20261008160534_commerce_approved_delivery_context_v1.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../../supabase/migrations/20261008223000_commerce_approved_shipping_quote_v2.sql', import.meta.url), 'utf8'));
});
after(async () => { await db?.close(); });
async function service(fn, client = db) { await client.query('set role service_role'); try { return await fn(client); } finally { await client.query('reset role'); } }
const read = () => service(async c => (await c.query('select public.feya_commerce_read_delivery_workspace_v1() r')).rows[0].r);
const save = (draft, revision, requestId = randomUUID(), actorId = actor, client = db) => service(async c => (await c.query('select public.feya_commerce_save_delivery_workspace_v1($1,$2,$3::jsonb,$4) r', [requestId, revision, JSON.stringify(draft), actorId])).rows[0].r, client);
const count = async () => (await db.query('select count(*)::int n from public.feya_commerce_delivery_workspace_versions_v1')).rows[0].n;

test('new schema contains no draft or active rate; public and authenticated roles cannot read or execute', async () => {
  const initial = await read(); assert.equal(initial.revision, 0); assert.equal(initial.draft, null); assert.equal(initial.public_rates_enabled, false);
  await assert.rejects(service(c => c.query('select public.feya_commerce_approved_delivery_context_v1($1::uuid[])', [[randomUUID()]])), /approval_required/);
  for (const role of ['anon', 'authenticated']) {
    await db.query('set role ' + role);
    try {
      await assert.rejects(db.query('select * from public.feya_commerce_delivery_workspace_versions_v1'), /permission denied/);
      for (const fn of ['feya_commerce_read_delivery_workspace_v1', 'feya_commerce_delivery_catalog_v1', 'feya_commerce_delivery_workspace_health_v1']) await assert.rejects(db.query('select public.' + fn + '()'), /permission denied/);
      await assert.rejects(db.query('select public.feya_commerce_save_delivery_workspace_v1($1,0,$2::jsonb,$3)', [randomUUID(), JSON.stringify(emptyDeliveryWorkspace()), actor]), /permission denied/);
    } finally { await db.query('reset role'); }
  }
  assert.equal((await db.query("select has_table_privilege('service_role','public.feya_commerce_delivery_workspace_versions_v1','INSERT,UPDATE,DELETE') allowed")).rows[0].allowed, false);
});
test('protected catalog resolves configuration identity and current offer currency without changing product truth', async () => {
  const catalog = await service(async c => (await c.query('select public.feya_commerce_delivery_catalog_v1() r')).rows[0].r);
  assert.equal(catalog.length, 1); assert.equal(catalog[0].canonical_product_id, variantTestIds.product);
  assert.equal(catalog[0].configurations[0].configuration_price_id, variantTestIds.config);
  assert.deepEqual(catalog[0].configurations[0].currencies, ['EUR']);
});
let firstId, firstReceipt;
test('first owner save creates immutable history and one draft head with explicit non-payable flags', async () => {
  firstId = randomUUID(); firstReceipt = await save(syntheticDeliveryWorkspace(), 0, firstId);
  assert.equal(firstReceipt.revision, 1); assert.equal(firstReceipt.payment_enabled, false); assert.equal(firstReceipt.public_rates_enabled, false);
  assert.equal(firstReceipt.replayed, false); const state = await read(); assert.equal(state.version_id, firstReceipt.version_id);
  assert.deepEqual(state.draft, syntheticDeliveryWorkspace());
  assert.equal((await db.query('select actor_id from public.feya_commerce_delivery_workspace_versions_v1')).rows[0].actor_id, actor);
});
test('same-key retry reuses the version; actor, snapshot or expected-revision substitution conflicts', async () => {
  const replay = await save(syntheticDeliveryWorkspace(), 0, firstId); assert.equal(replay.replayed, true); assert.equal(replay.version_id, firstReceipt.version_id);
  const changed = syntheticDeliveryWorkspace(); changed.shipping_profiles[0].name = 'Changed';
  await assert.rejects(save(changed, 0, firstId), /request_conflict/);
  await assert.rejects(save(syntheticDeliveryWorkspace(), 1, firstId), /request_conflict/);
  await assert.rejects(save(syntheticDeliveryWorkspace(), 0, firstId, otherActor), /request_conflict/);
  assert.equal(await count(), 1);
});
test('stale revision and invalid product/configuration assignments roll back without a new version', async () => {
  const d = syntheticDeliveryWorkspace(); await assert.rejects(save(d, 0), /revision_conflict/);
  d.assignments.push({ canonical_product_id: variantTestIds.product, configuration_price_id: randomUUID(), shipping_profile_id: d.shipping_profiles[0].id, production_profile_id: null });
  await assert.rejects(save(d, 1), /assignment_target_invalid/); assert.equal(await count(), 1);
  await assert.rejects(save({ ...emptyDeliveryWorkspace(), payment_enabled: true }, 1), /draft_invalid/);
  await assert.rejects(save(emptyDeliveryWorkspace(), 1, randomUUID(), randomUUID()), /request_invalid/);
});
test('head failure rolls back the history insert; retry with exact request id succeeds', async () => {
  const d = emptyDeliveryWorkspace(), requestId = randomUUID();
  await db.exec("create function public.test_reject_delivery_head() returns trigger language plpgsql as $$ begin raise exception 'injected delivery head failure'; end $$;create trigger test_reject_delivery_head before insert or update on public.feya_commerce_delivery_workspace_head_v1 for each row execute function public.test_reject_delivery_head();");
  try { await assert.rejects(save(d, 1, requestId), /injected delivery head failure/); assert.equal(await count(), 1); assert.equal((await read()).revision, 1); }
  finally { await db.exec('drop trigger test_reject_delivery_head on public.feya_commerce_delivery_workspace_head_v1;drop function public.test_reject_delivery_head();'); }
  assert.equal((await save(d, 1, requestId)).revision, 2); assert.equal(await count(), 2);
});
test('renaming preserves stable profile ids and replaying old success never moves the current head backwards', async () => {
  const d = syntheticDeliveryWorkspace(); d.shipping_profiles[0].name = 'Renamed profile';
  const receipt = await save(d, 2); assert.equal(receipt.revision, 3);
  assert.equal((await read()).draft.shipping_profiles[0].id, d.shipping_profiles[0].id);
  assert.equal((await save(syntheticDeliveryWorkspace(), 0, firstId)).version_id, firstReceipt.version_id);
  assert.equal((await read()).revision, 3);
  await assert.rejects(db.query("update public.feya_commerce_delivery_workspace_versions_v1 set draft='{}' where version_id=$1", [receipt.version_id]), /history_immutable/);
  await assert.rejects(db.query('delete from public.feya_commerce_delivery_workspace_versions_v1 where version_id=$1', [receipt.version_id]), /history_immutable/);
});
test('permission drift closes the workspace before reads or writes', async () => {
  await db.exec('grant select on public.feya_commerce_delivery_workspace_versions_v1 to authenticated');
  try { await assert.rejects(read(), /boundary_not_ready/); await assert.rejects(save(emptyDeliveryWorkspace(), 3), /boundary_not_ready/); }
  finally { await db.exec('revoke select on public.feya_commerce_delivery_workspace_versions_v1 from authenticated'); }
  assert.equal(await count(), 3);
});
test('native concurrent edits of the same revision allow one save and one conflict', { skip: !nativeURL }, async () => {
  const clients = await Promise.all([connect(), connect()]);
  try {
    const result = await Promise.allSettled(clients.map(c => save(emptyDeliveryWorkspace(), 3, randomUUID(), actor, c)));
    assert.equal(result.filter(r => r.status === 'fulfilled').length, 1); assert.equal(result.filter(r => r.status === 'rejected').length, 1);
    assert.match(result.find(r => r.status === 'rejected').reason.message, /revision_conflict/); assert.equal(await count(), 4);
  } finally { await Promise.all(clients.map(c => c.end())); }
});

const context = () => service(async c => (await c.query('select public.feya_commerce_delivery_approval_context_v1() r')).rows[0].r);
const approvalCount = async () => (await db.query('select count(*)::int n from public.feya_commerce_delivery_approvals_v1')).rows[0].n;
const makeApproval = c => ({ request_id: randomUUID(), expected_revision: c.approval.revision,
  workspace_version_id: c.workspace.version_id, workspace_revision: c.workspace.revision,
  snapshot_sha256: c.workspace.snapshot_sha256, catalog_sha256: c.catalog_sha256, actor_id: actor, business_review_confirmed: true,
  validation: deliveryApprovalReadiness(c.workspace.draft, c.catalog) });
const approve = (r, client = db) => service(async c => (await c.query('select public.feya_commerce_approve_delivery_workspace_v1($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) r',
  [r.request_id,r.expected_revision,r.workspace_version_id,r.workspace_revision,r.snapshot_sha256,r.catalog_sha256,r.business_review_confirmed,r.actor_id,r.validation === null ? null : JSON.stringify(r.validation)])).rows[0].r, client);
let originalApproval, originalApprovalRequest;
test('approval schema starts empty and cannot be accessed or mutated by browser roles', async () => {
  // Native draft-concurrency intentionally ends with an incomplete draft; start
  // this independent approval group with explicit complete synthetic settings.
  await save(syntheticDeliveryWorkspace(), (await read()).revision);
  const c = await context(); assert.equal(c.approval.revision, 0); assert.equal(await approvalCount(), 0);
  assert.equal(c.catalog_sha256.length, 64); assert.equal(c.approval.public_rates_enabled, false);
  const r = makeApproval(c);
  for (const role of ['anon','authenticated']) {
    await db.query('set role ' + role);
    try {
      for (const table of ['feya_commerce_delivery_approvals_v1','feya_commerce_delivery_approval_head_v1']) await assert.rejects(db.query('select * from public.' + table), /permission denied/);
      for (const name of ['feya_commerce_delivery_approval_context_v1','feya_commerce_read_delivery_approval_v1','feya_commerce_delivery_approval_health_v1']) await assert.rejects(db.query('select public.' + name + '()'), /permission denied/);
      await assert.rejects(db.query('select public.feya_commerce_approve_delivery_workspace_v1($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)',
        [r.request_id,0,r.workspace_version_id,r.workspace_revision,r.snapshot_sha256,r.catalog_sha256,true,actor,JSON.stringify(r.validation)]), /permission denied/);
    } finally { await db.query('reset role'); }
  }
  for (const table of ['feya_commerce_delivery_approvals_v1','feya_commerce_delivery_approval_head_v1']) assert.equal((await db.query("select has_table_privilege('service_role',$1,'INSERT,UPDATE,DELETE,TRUNCATE') allowed", ['public.' + table])).rows[0].allowed, false);
});
test('approval requires exact draft and catalog evidence plus separate business confirmation', async () => {
  const r = makeApproval(await context()); assert.equal(r.validation.ready, true);
  assert.equal(await approve({ ...r, validation: null }), null); assert.equal(await approvalCount(), 0);
  for (const change of [{ workspace_version_id: randomUUID() }, { workspace_revision: 99 }, { snapshot_sha256: 'f'.repeat(64) }, { expected_revision: 1 }]) await assert.rejects(approve({ ...r, ...change }), /revision_conflict/);
  await assert.rejects(approve({ ...r, catalog_sha256: 'f'.repeat(64) }), /catalog_conflict/);
  await assert.rejects(approve({ ...r, business_review_confirmed: false }), /request_invalid/);
  await assert.rejects(approve({ ...r, validation: { ...r.validation, configuration_count: 99 } }), /validation_invalid/);
  await assert.rejects(approve({ ...r, validation: { ...r.validation, public_rates_enabled: true } }), /validation_invalid/);
  assert.equal(await approvalCount(), 0);
  originalApprovalRequest = r; originalApproval = await approve(r);
  assert.equal(originalApproval.revision, 1); assert.equal(originalApproval.replayed, false); assert.equal(originalApproval.payment_enabled, false);
  const row = (await db.query('select actor_id,business_review_contract,validation from public.feya_commerce_delivery_approvals_v1')).rows[0];
  assert.equal(row.actor_id, actor); assert.equal(row.business_review_contract, 'owner_delivery_business_review_v1'); assert.deepEqual(row.validation, r.validation);
});
test('approval idempotency is bound to actor, catalog, draft and head; history cannot be rewritten', async () => {
  const replay = await approve({ ...originalApprovalRequest, validation: null }); assert.equal(replay.replayed, true); assert.equal(replay.approval_id, originalApproval.approval_id);
  for (const change of [{ actor_id: otherActor }, { catalog_sha256: 'f'.repeat(64) }, { snapshot_sha256: 'f'.repeat(64) }, { expected_revision: 1 }]) await assert.rejects(approve({ ...originalApprovalRequest, ...change, validation: null }), /request_conflict/);
  await assert.rejects(db.query("update public.feya_commerce_delivery_approvals_v1 set catalog_sha256=$1", ['f'.repeat(64)]), /history_immutable/);
  await assert.rejects(db.query('delete from public.feya_commerce_delivery_approvals_v1'), /history_immutable/);
  assert.equal(await approvalCount(), 1);
});
test('a failed approved-head update rolls back the approval and the exact retry can succeed', async () => {
  const r = makeApproval(await context());
  await db.exec("create function public.test_reject_approval_head() returns trigger language plpgsql as $$ begin raise exception 'injected approval head failure'; end $$;create trigger test_reject_approval_head before insert or update on public.feya_commerce_delivery_approval_head_v1 for each row execute function public.test_reject_approval_head();");
  try { await assert.rejects(approve(r), /injected approval head failure/); assert.equal(await approvalCount(), 1); assert.equal((await context()).approval.revision, 1); }
  finally { await db.exec('drop trigger test_reject_approval_head on public.feya_commerce_delivery_approval_head_v1;drop function public.test_reject_approval_head();'); }
  assert.equal((await approve(r)).revision, 2); assert.equal(await approvalCount(), 2);
  assert.equal((await approve({ ...originalApprovalRequest, validation: null })).approval_id, originalApproval.approval_id);
  assert.equal((await context()).approval.revision, 2);
});
test('draft edits leave the approved snapshot intact and prevent an old candidate becoming a new approval', async () => {
  const before = await context(), stale = makeApproval(before), changed = structuredClone(before.workspace.draft);
  changed.shipping_profiles[0].name = 'Later draft'; await save(changed, before.workspace.revision);
  const after = await context(); assert.equal(after.approval.workspace_version_id, before.approval.workspace_version_id);
  assert.notEqual(after.workspace.version_id, after.approval.workspace_version_id);
  await assert.rejects(approve(stale), /revision_conflict/);
  assert.equal((await approve({ ...originalApprovalRequest, validation: null })).approval_id, originalApproval.approval_id);
  assert.equal((await context()).approval.revision, 2);
});
test('permission drift closes approval reads and writes without widening existing privileges', async () => {
  const r = makeApproval(await context()); await db.exec('grant select on public.feya_commerce_delivery_approvals_v1 to authenticated');
  try { await assert.rejects(context(), /boundary_not_ready/); await assert.rejects(approve(r), /boundary_not_ready/); }
  finally { await db.exec('revoke select on public.feya_commerce_delivery_approvals_v1 from authenticated'); }
  assert.equal(await approvalCount(), 2);
});
test('native concurrent approvals of one head allow one new immutable receipt', { skip: !nativeURL }, async () => {
  const c = await context(), clients = await Promise.all([connect(),connect()]);
  try {
    const result = await Promise.allSettled(clients.map(client => approve(makeApproval(c), client)));
    assert.equal(result.filter(r => r.status === 'fulfilled').length, 1); assert.equal(result.filter(r => r.status === 'rejected').length, 1);
    assert.match(result.find(r => r.status === 'rejected').reason.message, /revision_conflict/); assert.equal(await approvalCount(), 3);
  } finally { await Promise.all(clients.map(c => c.end())); }
});

const approvedContext = ids => service(async c => (await c.query('select public.feya_commerce_approved_delivery_context_v1($1::uuid[]) r', [ids])).rows[0].r);
let merchandiseReceipt;
test('approved delivery resolver is an invoker read inaccessible to browser roles', async () => {
  const f = (await db.query("select prosecdef,provolatile from pg_proc where oid='public.feya_commerce_approved_delivery_context_v1(uuid[])'::regprocedure")).rows[0];
  assert.equal(f.prosecdef, false); assert.equal(f.provolatile, 's');
  for (const role of ['anon','authenticated']) {
    await db.query('set role ' + role);
    try { await assert.rejects(db.query('select public.feya_commerce_approved_delivery_context_v1($1::uuid[])', [[randomUUID()]]), /permission denied/); }
    finally { await db.query('reset role'); }
  }
  const i = variantTestIds;
  merchandiseReceipt = await service(async c => (await c.query('select public.feya_commerce_create_quote_v1($1::jsonb) r', [JSON.stringify({
    request_id: randomUUID(), canonical_product_id: i.product, variant_id: i.variant, configuration_price_id: i.config,
    color_id: i.gold, size_id: null, expected_product_revision: 1, expected_offer_revision: 1, quantity: 2,
  })])).rows[0].r);
});
test('an edited draft never changes the exact approved delivery snapshot used by server receipts', async () => {
  const c = await context(), changed = structuredClone(c.workspace.draft);
  changed.shipping_profiles[0].rules[0].standard.amount_minor = 9999;
  await save(changed, c.workspace.revision);
  const r = await approvedContext([merchandiseReceipt.quote_receipt_id]);
  assert.equal(r.approved_workspace.version_id, r.approval.workspace_version_id);
  assert.equal(r.approved_workspace.snapshot_sha256, r.approval.snapshot_sha256);
  assert.notEqual(r.approved_workspace.version_id, (await read()).version_id);
  assert.equal(r.approved_workspace.draft.shipping_profiles[0].rules[0].standard.amount_minor, 1900);
  const rpcClient = { rpc: async (name, args) => ({ data: await approvedContext(args.p_quote_receipt_ids), error: null }) };
  const result = await resolveApprovedDelivery(rpcClient, { contract_version: APPROVED_DELIVERY_RESOLUTION,
    quote_receipt_ids: [merchandiseReceipt.quote_receipt_id], country: 'US', postal_code: '10001', shipping_method: 'standard' });
  assert.equal(result.shipping_amount_minor, 1900); assert.equal(result.parcels[0].quantity, 2);
  assert.equal(result.persisted, false); assert.equal(result.payable, false); assert.equal(result.payment_enabled, false);
  assert.equal(await approvalCount(), nativeURL ? 3 : 2);
});
test('missing or duplicate merchandise receipts are rejected; no quote is silently omitted', async () => {
  await assert.rejects(approvedContext([randomUUID()]), /quote_not_current/);
  await assert.rejects(approvedContext([merchandiseReceipt.quote_receipt_id, randomUUID()]), /quote_not_current/);
  await assert.rejects(approvedContext([merchandiseReceipt.quote_receipt_id, merchandiseReceipt.quote_receipt_id]), /request_invalid/);
  await assert.rejects(approvedContext([]), /request_invalid/);
});
test('a new offer head invalidates old price receipts even when the catalog currency is unchanged', async () => {
  const newer = await seedApprovedOfferProjection(db, { offerRevisionId: randomUUID(), priceQuoteId: randomUUID(), offerRevision: 2 });
  await db.query('update public.feya_commerce_offer_heads_v1 set current_offer_revision_id=$1 where canonical_product_id=$2', [newer.offerRevisionId, variantTestIds.product]);
  try { await assert.rejects(approvedContext([merchandiseReceipt.quote_receipt_id]), /quote_not_current/); }
  finally { await db.query('update public.feya_commerce_offer_heads_v1 set current_offer_revision_id=$1 where canonical_product_id=$2', [merchandiseReceipt.offer_revision_id, variantTestIds.product]); }
});
test('expired merchandise is rejected even when its exact approved offer is still current', async () => {
  const expiredId = randomUUID();
  await db.query(`insert into public.feya_commerce_quote_receipts_v1(
    quote_receipt_id,request_id,request_sha256,offer_revision_id,canonical_product_id,product_revision,
    variant_id,configuration_price_id,color_id,size_id,quantity,unit_amount_minor,line_amount_minor,currency,
    price_quote_id,price_revision,price_source,response,expires_at)
    select $1,$2,request_sha256,offer_revision_id,canonical_product_id,product_revision,
      variant_id,configuration_price_id,color_id,size_id,quantity,unit_amount_minor,line_amount_minor,currency,
      price_quote_id,price_revision,price_source,response,now()-interval '1 day'
    from public.feya_commerce_quote_receipts_v1 where quote_receipt_id=$3`, [expiredId,randomUUID(),merchandiseReceipt.quote_receipt_id]);
  await assert.rejects(approvedContext([expiredId]), /quote_not_current/);
});
test('catalog drift and permission drift close the resolver without changing any approved head', async () => {
  const beforeApproval = (await context()).approval;
  await db.query('delete from public.feya_commerce_offer_heads_v1 where canonical_product_id=$1', [variantTestIds.product]);
  try { await assert.rejects(approvedContext([merchandiseReceipt.quote_receipt_id]), /catalog_changed/); }
  finally { await db.query('insert into public.feya_commerce_offer_heads_v1(canonical_product_id,current_offer_revision_id) values($1,$2)', [variantTestIds.product, merchandiseReceipt.offer_revision_id]); }
  await db.exec('grant execute on function public.feya_commerce_approved_delivery_context_v1(uuid[]) to authenticated');
  try { await assert.rejects(approvedContext([merchandiseReceipt.quote_receipt_id]), /boundary_not_ready/); }
  finally { await db.exec('revoke execute on function public.feya_commerce_approved_delivery_context_v1(uuid[]) from authenticated'); }
  assert.equal((await approvedContext([merchandiseReceipt.quote_receipt_id])).approval.workspace_version_id, beforeApproval.workspace_version_id);
});

const makeV2Request = () => ({
  contract_version: 'commerce_approved_shipping_quote_v2', request_id: randomUUID(),
  quote_receipt_ids: [merchandiseReceipt.quote_receipt_id], country: 'US', postal_code: '10001',
  shipping_method: 'standard',
});
const approvedQuoteResolution = async () => {
  const client = { rpc: async (name, args) => {
    assert.equal(name, 'feya_commerce_approved_delivery_context_v1');
    return { data: await approvedContext(args.p_quote_receipt_ids), error: null };
  } };
  return resolveApprovedDelivery(client, { contract_version: APPROVED_DELIVERY_RESOLUTION,
    quote_receipt_ids: [merchandiseReceipt.quote_receipt_id], country: 'US', postal_code: '10001',
    shipping_method: 'standard' });
};
const saveShippingV2 = (request, resolution, client = db) => service(async c =>
  (await c.query('select public.feya_commerce_create_approved_shipping_quote_v2($1::jsonb,$2::jsonb) r',
    [JSON.stringify(request),JSON.stringify(resolution)])).rows[0].r, client);
const lookupShippingV2 = (request, client = db) => service(async c =>
  (await c.query('select public.feya_commerce_lookup_approved_shipping_quote_v2($1::jsonb) r',
    [JSON.stringify(request)])).rows[0].r, client);
const v2Count = async () => (await db.query('select count(*)::int n from public.feya_commerce_approved_shipping_quote_receipts_v2')).rows[0].n;

test('approved v2 shipping quote receipts and RPCs are strictly private, immutable and default nonpayable', async () => {
  const health = await service(async c => (await c.query('select public.feya_commerce_approved_shipping_quote_health_v2() r')).rows[0].r);
  assert.equal(health.ready, true); assert.equal(health.public_rates_enabled, false); assert.equal(health.payment_enabled, false);
  for (const role of ['anon','authenticated']) {
    await db.query('set role ' + role);
    try {
      await assert.rejects(db.query('select * from public.feya_commerce_approved_shipping_quote_receipts_v2'), /permission denied/);
      for (const call of [
        'select public.feya_commerce_approved_shipping_quote_health_v2()',
        'select public.feya_commerce_lookup_approved_shipping_quote_v2(\'{}\'::jsonb)',
        'select public.feya_commerce_create_approved_shipping_quote_v2(\'{}\'::jsonb,\'{}\'::jsonb)'
      ]) await assert.rejects(db.query(call), /permission denied/);
    } finally { await db.query('reset role'); }
  }
  assert.equal(await v2Count(), 0);
});

let v2Request, v2Receipt, v2Resolution;
test('approved workspace / current merchandise creates one immutable 15-minute destination-aware shipping quote', async () => {
  v2Request = makeV2Request(); v2Resolution = await approvedQuoteResolution();
  assert.equal(v2Resolution.shipping_amount_minor, 1900); assert.equal(v2Resolution.currency, 'EUR');
  assert.equal(await lookupShippingV2(v2Request), null);
  v2Receipt = await saveShippingV2(v2Request, v2Resolution);
  assert.equal(v2Receipt.currency, 'EUR'); assert.equal(v2Receipt.amount_minor, 1900);
  assert.equal(v2Receipt.persisted, true); assert.equal(v2Receipt.payable, false);
  assert.equal(v2Receipt.payment_enabled, false); assert.equal(v2Receipt.provider_session_enabled, false);
  assert.equal(v2Receipt.public_rates_enabled, false); assert.equal(v2Receipt.replayed, false);
  assert.equal(v2Receipt.workspace_version_id, v2Resolution.workspace_version_id);
  assert.equal(v2Receipt.basket_sha256, v2Resolution.basket_sha256);
  assert.equal(v2Receipt.destination_sha256, v2Resolution.destination_sha256);
  assert.ok(Date.parse(v2Receipt.expires_at) > Date.parse(v2Receipt.created_at));
  assert.ok(Math.abs(Date.parse(v2Receipt.expires_at) - Date.parse(v2Receipt.created_at) - 900000) < 1000);
  assert.equal(await v2Count(), 1);
});

test('same request ID and normalized destination replay exact historical quote; changed request conflicts', async () => {
  const replay = await saveShippingV2(v2Request, { ...v2Resolution, shipping_amount_minor: 9999 });
  assert.equal(replay.replayed, true); assert.equal(replay.amount_minor, 1900);
  assert.equal(replay.shipping_quote_receipt_id, v2Receipt.shipping_quote_receipt_id);
  const read = await lookupShippingV2({ ...v2Request, postal_code: '10 001' });
  assert.equal(read.replayed, true); assert.equal(read.shipping_quote_receipt_id, v2Receipt.shipping_quote_receipt_id);
  await assert.rejects(lookupShippingV2({ ...v2Request, country: 'AU' }), /request_conflict/);
  await assert.rejects(saveShippingV2({ ...v2Request, postal_code: '90001' }, v2Resolution), /request_conflict/);
  assert.equal(await v2Count(), 1);
});

test('v2 writer refuses modified money, authority, stale server clock and forbids immutable history edits', async () => {
  const req = makeV2Request();
  await assert.rejects(saveShippingV2(req, { ...v2Resolution, shipping_amount_minor: 1901 }), /amount_invalid/);
  await assert.rejects(saveShippingV2(req, { ...v2Resolution, currency: 'USD' }), /resolution_invalid/);
  await assert.rejects(saveShippingV2(req, { ...v2Resolution, snapshot_sha256: 'f'.repeat(64) }), /authority_changed/);
  await assert.rejects(saveShippingV2(req, { ...v2Resolution, calculated_at: '2026-01-01T00:00:00Z' }), /resolution_stale/);
  await assert.rejects(db.query('update public.feya_commerce_approved_shipping_quote_receipts_v2 set amount_minor=1'), /history_immutable/);
  await assert.rejects(db.query('delete from public.feya_commerce_approved_shipping_quote_receipts_v2'), /history_immutable/);
  assert.equal(await v2Count(), 1);
});

test('no current approved owner delivery head cannot create a new v2 shipping quote', async () => {
  const head = (await db.query("select approval_id, revision from public.feya_commerce_delivery_approval_head_v1 where workspace_key='thefeya'")).rows[0];
  await db.query("delete from public.feya_commerce_delivery_approval_head_v1 where workspace_key='thefeya'");
  try {
    await assert.rejects(saveShippingV2(makeV2Request(), v2Resolution), /approved_delivery_approval_required/);
    assert.equal(await v2Count(), 1);
  } finally {
    await db.query("insert into public.feya_commerce_delivery_approval_head_v1(workspace_key,approval_id,revision) values('thefeya',$1,$2)", [head.approval_id,head.revision]);
  }
});

test('replaced approved delivery head rejects stale computed EUR amount before insertion', async () => {
  const current = (await db.query("select approval_id,revision from public.feya_commerce_delivery_approval_head_v1 where workspace_key='thefeya'")).rows[0];
  const alternative = (await db.query('select approval_id,revision from public.feya_commerce_delivery_approvals_v1 where approval_id<>$1 order by revision limit 1', [current.approval_id])).rows[0];
  assert.ok(alternative);
  await db.query("update public.feya_commerce_delivery_approval_head_v1 set approval_id=$1,revision=$2 where workspace_key='thefeya'", [alternative.approval_id,alternative.revision]);
  try {
    await assert.rejects(saveShippingV2(makeV2Request(), v2Resolution), /approved_shipping_quote_authority_changed/);
    assert.equal(await v2Count(), 1);
  } finally {
    await db.query("update public.feya_commerce_delivery_approval_head_v1 set approval_id=$1,revision=$2 where workspace_key='thefeya'", [current.approval_id,current.revision]);
  }
});

test('offer head drift invalidates v2 creation before it writes a customer receipt', async () => {
  const newer = await seedApprovedOfferProjection(db, { offerRevisionId: randomUUID(), priceQuoteId: randomUUID(), offerRevision: 22 });
  await db.query('update public.feya_commerce_offer_heads_v1 set current_offer_revision_id=$1 where canonical_product_id=$2', [newer.offerRevisionId, variantTestIds.product]);
  try {
    await assert.rejects(saveShippingV2(makeV2Request(), v2Resolution), /approved_delivery_(quote_not_current|catalog_changed)/);
    assert.equal(await v2Count(), 1);
  } finally { await db.query('update public.feya_commerce_offer_heads_v1 set current_offer_revision_id=$1 where canonical_product_id=$2', [merchandiseReceipt.offer_revision_id,variantTestIds.product]); }
});

test('native concurrent same-key quote writes persist one receipt and exact replay', { skip: !nativeURL }, async () => {
  const request = makeV2Request(), resolution = await approvedQuoteResolution();
  const clients = await Promise.all([connect(),connect()]);
  try {
    const outcomes = await Promise.all(clients.map(c => saveShippingV2(request,resolution,c)));
    assert.equal(outcomes.length,2);
    assert.equal(outcomes[0].shipping_quote_receipt_id,outcomes[1].shipping_quote_receipt_id);
    assert.deepEqual(outcomes.map(v => v.replayed).sort(), [false,true]);
    assert.equal(await v2Count(),2);
  } finally { await Promise.all(clients.map(c => c.end())); }
});
