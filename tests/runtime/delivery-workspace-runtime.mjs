import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { commerceQuoteMigrationSQL, seedApprovedOfferProjection, variantTestIds as ids } from '../search-db/helpers/commerce-quote.mjs';
import { syntheticDeliveryWorkspace, syntheticDeliveryRequest } from '../fixtures/commerceDeliveryWorkspace.ts';

/** Real isolated Auth -> Next -> PostgREST -> immutable owner draft -> browser preview. */
export async function verifyDeliveryWorkspaceRuntime({ db, browser, ownerPage, env, out, check, report, service, outsider, url, anon, otherEmail, password }) {
  assert.ok(['localhost', '127.0.0.1'].includes(db.connectionParameters.host));
  const base = 'http://127.0.0.1:3009', path = '/api/admin/company/delivery-workspace';
  let server, approvalOffServer, approvalRequest, log = '';
  const post = async (body, headers = { Origin: base }) => {
    const r = await ownerPage.request.post(base + path, { data: body, headers }); return { status: r.status(), body: await r.json() };
  };
  const read = async () => { const r = await ownerPage.request.get(base + path); assert.equal(r.status(), 200); assert.match(r.headers()['cache-control'], /private.*no-store/); return r.json(); };
  try {
    await check('Delivery workspace migration restores against real commerce dependencies; protected catalog resolves EUR', async () => {
      await db.query(await commerceQuoteMigrationSQL());
      const offer = await seedApprovedOfferProjection(db, {});
      await db.query('insert into public.feya_commerce_offer_heads_v1(canonical_product_id,current_offer_revision_id) values($1,$2)', [ids.product, offer.offerRevisionId]);
      await db.query(await readFile('supabase/migrations/20261007211548_commerce_delivery_workspace_draft_v1.sql', 'utf8'));
      await db.query(await readFile('supabase/migrations/20261008083213_commerce_delivery_approval_v1.sql', 'utf8'));
      let ready = false;
      for (let i = 0; i < 40; i++) { const r = await service.rpc('feya_commerce_delivery_workspace_health_v1'); if (!r.error && r.data?.ready) { ready = true; break; } await new Promise(r => setTimeout(r, 150)); }
      assert.ok(ready);
    });
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3009'], {
      env: { ...env, FEYA_OWNER_ACTION_AUTH_REQUIRED: 'true', FEYA_OWNER_ACTIONS_ENABLED: 'false', FEYA_DELIVERY_WORKSPACE_DRAFT_ENABLED: 'true', FEYA_DELIVERY_WORKSPACE_APPROVAL_ENABLED: 'true' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout.on('data', b => log += b); server.stderr.on('data', b => log += b);
    let ready = false;
    for (let i = 0; i < 60; i++) { try { if ((await fetch(base + '/admin/login')).status === 200) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 250)); }
    assert.ok(ready);
    await check('Delivery APIs require an owner, reject public RPCs, default-off actions and foreign or missing origins', async () => {
      const initial = await read(); assert.equal(initial.workspace.revision, 0); assert.deepEqual(initial.catalog[0].configurations[0].currencies, ['EUR']);
      assert.equal((await fetch(base + path)).status, 401);
      const disabled = await ownerPage.request.get('http://127.0.0.1:3000' + path);
      assert.equal(disabled.status(), 423); assert.equal((await disabled.json()).code, 'delivery_workspace_draft_disabled');
      const unrelated = await ownerPage.request.get(base + '/api/admin/review/prices/baseline-adoption');
      assert.equal(unrelated.status(), 423); assert.equal((await unrelated.json()).code, 'owner_actions_disabled');
      const body = { action: 'save', request_id: randomUUID(), expected_revision: 0, draft: syntheticDeliveryWorkspace() };
      for (const headers of [{}, { Origin: 'https://untrusted.example' }, { Origin: 'null' }]) assert.equal((await post(body, headers)).status, 403);
      const publicClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      for (const client of [publicClient, outsider]) for (const name of ['feya_commerce_read_delivery_workspace_v1', 'feya_commerce_delivery_catalog_v1', 'feya_commerce_delivery_workspace_health_v1', 'feya_commerce_delivery_approval_context_v1', 'feya_commerce_read_delivery_approval_v1', 'feya_commerce_delivery_approval_health_v1']) {
        const r = await client.rpc(name); assert.equal(r.error?.code, '42501', 'Known RPC must reject the role for insufficient privileges');
        if (client === publicClient) assert.ok([401, 403].includes(r.status)); else assert.equal(r.status, 403);
      }
      const jar = new Map(), client = createServerClient(url, anon, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: values => values.forEach(c => jar.set(c.name, c.value)) } });
      assert.equal((await client.auth.signInWithPassword({ email: otherEmail, password })).error, null);
      const context = await browser.newContext(); await context.addCookies([...jar].map(([name, value]) => ({ name, value, url: base })));
      try { assert.equal((await context.request.get(base + path)).status(), 403); } finally { await context.close(); }
    });
    await check('Delivery save is atomic, idempotent, actor-bound and refuses a stale second tab', async () => {
      const first = { action: 'save', request_id: randomUUID(), expected_revision: 0, draft: syntheticDeliveryWorkspace() };
      const saved = await post(first); assert.equal(saved.status, 200, JSON.stringify(saved.body)); assert.equal(saved.body.receipt.public_rates_enabled, false);
      const replay = await post(first); assert.equal(replay.body.receipt.replayed, true); assert.equal(replay.body.receipt.version_id, saved.body.receipt.version_id);
      assert.equal((await post({ ...first, actor_id: randomUUID() })).status, 400);
      assert.equal((await post({ ...first, request_id: randomUUID(), expected_revision: 1, draft: { ...first.draft, payment_enabled: true } })).status, 422);
      const edits = await Promise.all([post({ ...first, expected_revision: 1, request_id: randomUUID() }), post({ ...first, expected_revision: 1, request_id: randomUUID() })]);
      assert.deepEqual(edits.map(r => r.status).sort(), [200, 409]); assert.equal((await read()).workspace.revision, 2);
      const current = (await read()).workspace;
      const p = await post({ action: 'preview', expected_revision: current.revision, request: syntheticDeliveryRequest() });
      assert.equal(p.status, 200); assert.equal(p.body.preview.currency, 'EUR'); assert.equal(p.body.preview.shipping_amount_minor, 1900); assert.equal(p.body.preview.payable, false);
      assert.equal(p.body.preview.workspace_version_id, current.version_id); assert.ok(Date.parse(p.body.preview.calculated_at) <= Date.now());
      assert.equal((await post({ action: 'preview', expected_revision: 1, request: syntheticDeliveryRequest() })).status, 409);
      assert.equal((await post({ action: 'preview', expected_revision: 2, request: { ...syntheticDeliveryRequest(), amount_minor: 1 } })).status, 422);
    });
    const page = await ownerPage.context().newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await check('Owner delivery UI renames profiles, saves assignments and runs the server date preview', async () => {
      await page.goto(base + '/admin/company/delivery'); await page.getByRole('heading', { name: 'Доставка и изготовление', exact: true }).waitFor();
      await page.getByLabel('Название профиля', { exact: true }).first().fill('Доставка: переименованный профиль');
      await page.getByLabel('Обслуживаемые страны, коды через запятую').fill('US, AU, MX');
      await page.getByLabel('Товар', { exact: true }).selectOption(ids.product);
      await page.getByLabel('Конфигурация', { exact: true }).selectOption(ids.config);
      await page.getByLabel('Профиль доставки для привязки', { exact: true }).selectOption(syntheticDeliveryWorkspace().shipping_profiles[0].id);
      await page.getByRole('button', { name: 'Сохранить привязку в черновике', exact: true }).click();
      await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
      await page.getByText('Черновик сохранён новой версией. Публичные тарифы и оплата остаются выключенными.', { exact: true }).waitFor();
      const current = (await read()).workspace; assert.equal(current.draft.shipping_profiles[0].id, syntheticDeliveryWorkspace().shipping_profiles[0].id);
      assert.equal(current.draft.shipping_profiles[0].name, 'Доставка: переименованный профиль'); assert.deepEqual(current.draft.shipping_profiles[0].served_countries, ['US', 'AU', 'MX']);
      assert.equal(current.draft.assignments[0].canonical_product_id, ids.product);
      await page.getByRole('button', { name: 'Добавить выбранное в тестовый заказ', exact: true }).click();
      await page.getByRole('button', { name: 'Рассчитать доставку и даты', exact: true }).click();
      await page.getByText('Черновой расчёт доставки:', { exact: false }).waitFor();
      await page.getByLabel('Экспресс', { exact: true }).check();
      await page.getByRole('button', { name: 'Рассчитать доставку и даты', exact: true }).click();
      await page.getByText('Черновой расчёт доставки:', { exact: false }).waitFor();
      assert.deepEqual(errors, []);
    });
    await check('Owner approves an exact complete saved version; retries and later drafts retain immutable evidence', async () => {
      const initial = await read(); assert.equal(initial.approval_readiness.ready, true); assert.equal(initial.approval.revision, 0);
      const responsePromise = page.waitForResponse(r => r.url() === base + path && r.request().method() === 'POST' && r.request().postDataJSON()?.action === 'approve');
      await page.getByRole('button', { name: 'Утвердить сохранённую версию', exact: true }).click();
      const response = await responsePromise; assert.equal(response.status(), 200); approvalRequest = response.request().postDataJSON();
      await page.getByText('Сохранённая версия утверждена. Тарифы в корзине и оплата остаются выключенными.', { exact: true }).waitFor();
      const receipt = (await response.json()).receipt; assert.equal(receipt.payment_enabled, false); assert.equal(receipt.public_rates_enabled, false);
      assert.equal((await read()).approval.workspace_version_id, initial.workspace.version_id);
      const retry = await post(approvalRequest); assert.equal(retry.status, 200); assert.equal(retry.body.receipt.replayed, true); assert.equal(retry.body.receipt.approval_id, receipt.approval_id);
      for (const extra of [{ actor_id: randomUUID() }, { validation: { ready: true } }, { approved_at: 'now' }, { payment_enabled: true }, { business_review_confirmed: false }]) assert.equal((await post({ ...approvalRequest, ...extra })).status, 400);
      assert.equal((await post({ ...approvalRequest, request_id: randomUUID() })).status, 409);
      const changed = await post({ action: 'save', request_id: randomUUID(), expected_revision: initial.workspace.revision, draft: initial.workspace.draft });
      assert.equal(changed.status, 200); assert.notEqual((await read()).workspace.version_id, receipt.workspace_version_id);
      const oldRetry = await post(approvalRequest); assert.equal(oldRetry.status, 200); assert.equal(oldRetry.body.receipt.approval_id, receipt.approval_id);
      assert.equal((await read()).approval.revision, 1);
      assert.equal((await db.query('select count(*)::int n from public.feya_commerce_delivery_approvals_v1')).rows[0].n, 1);
      await page.reload(); await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).waitFor();
      // Reload starts a fresh test basket/target, so the following scenarios
      // explicitly choose their product instead of relying on previous UI state.
      await page.getByLabel('Товар', { exact: true }).selectOption(ids.product);
      await page.getByLabel('Конфигурация', { exact: true }).selectOption(ids.config);
      await page.getByRole('button', { name: 'Добавить выбранное в тестовый заказ', exact: true }).click();
    });
    await check('USD owner examples and unspecified production day basis save as drafts without becoming payable', async () => {
      await page.getByRole('button', { name: 'Добавить пример $19 / $35', exact: true }).click();
      await page.getByRole('button', { name: 'Добавить 7–10 дней', exact: true }).click();
      assert.equal(await page.getByRole('button', { name: 'Рассчитать доставку и даты', exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
      await page.getByText('Черновик сохранён новой версией. Публичные тарифы и оплата остаются выключенными.', { exact: true }).waitFor();
      const state = (await read()).workspace; assert.equal(state.draft.shipping_profiles[1].currency, 'USD'); assert.equal(state.draft.shipping_profiles[1].rules[0].standard.amount_minor, 1900);
      assert.equal(state.draft.production_profiles[1].duration.unit, null); assert.equal(state.public_rates_enabled, false);
      await page.getByLabel('Профиль доставки для привязки', { exact: true }).selectOption(state.draft.shipping_profiles[1].id);
      await page.getByRole('button', { name: 'Сохранить привязку в черновике', exact: true }).click();
      await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
      await page.getByText('Черновик сохранён новой версией. Публичные тарифы и оплата остаются выключенными.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Рассчитать доставку и даты', exact: true }).click();
      await page.getByRole('alert').getByText('Валюта доставки не совпадает с валютой товаров.', { exact: false }).waitFor();
      assert.equal(await page.getByText('Черновой расчёт доставки:', { exact: false }).count(), 0);
      const other = await post({ action: 'preview', expected_revision: (await read()).workspace.revision, request: syntheticDeliveryRequest() });
      assert.equal(other.status, 422); assert.equal(other.body.code, 'delivery_currency_mismatch');
      const current = await read(); assert.equal(current.approval_readiness.ready, false);
      assert.equal(await page.getByRole('button', { name: 'Утвердить сохранённую версию', exact: true }).isDisabled(), true);
      const attempt = await post({ ...approvalRequest, request_id: randomUUID(), expected_revision: current.approval.revision,
        expected_workspace_version_id: current.workspace.version_id, expected_workspace_revision: current.workspace.revision,
        expected_snapshot_sha256: current.workspace.snapshot_sha256, expected_catalog_sha256: current.catalog_sha256 });
      assert.equal(attempt.status, 422); assert.equal(attempt.body.code, 'delivery_approval_settings_incomplete');
    });
    await check('Approval stays disabled independently of authenticated draft editing and general owner actions', async () => {
      const offBase = 'http://127.0.0.1:3010';
      approvalOffServer = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3010'], {
        env: { ...env, FEYA_OWNER_ACTION_AUTH_REQUIRED: 'true', FEYA_OWNER_ACTIONS_ENABLED: 'false', FEYA_DELIVERY_WORKSPACE_DRAFT_ENABLED: 'true', FEYA_DELIVERY_WORKSPACE_APPROVAL_ENABLED: 'false' }, stdio: ['ignore','pipe','pipe'],
      });
      approvalOffServer.stdout.on('data', b => log += b); approvalOffServer.stderr.on('data', b => log += b);
      let started = false;
      for (let i=0;i<60;i++) { try { if ((await fetch(offBase + '/admin/login')).status === 200) { started=true; break; } } catch {} await new Promise(r => setTimeout(r,250)); }
      assert.ok(started);
      const get = await ownerPage.request.get(offBase + path); assert.equal(get.status(), 200);
      const state = await get.json(); assert.equal(state.approval_enabled, false); assert.equal(state.approval, null);
      const disabled = await ownerPage.request.post(offBase + path, { data: approvalRequest, headers: { Origin: offBase } });
      assert.equal(disabled.status(), 423); assert.equal((await disabled.json()).code, 'delivery_approval_disabled');
      assert.equal((await read()).approval.revision, 1);
    });
    await check('Delivery settings keep readable labels and no horizontal page overflow on desktop and mobile', async () => {
      await page.setViewportSize({ width: 1360, height: 900 });
      await page.locator('details.owner-card').evaluateAll(nodes => nodes.forEach(n => n.open = false));
      await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
      await page.screenshot({ path: join(out, 'delivery-workspace-desktop.png'), fullPage: true, animations: 'disabled', caret: 'hide' });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      const layout = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth,
        outside: [...document.querySelectorAll('main *')].filter(node => node.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(0, 12).map(node => ({ tag: node.tagName, class: node.className, right: node.getBoundingClientRect().right })) }));
      await page.screenshot({ path: join(out, 'delivery-workspace-mobile.png'), fullPage: true, animations: 'disabled', caret: 'hide' });
      assert.ok(layout.scroll <= layout.width, JSON.stringify(layout));
      assert.deepEqual(errors, []);
    });
    await page.close();
    report.delivery_workspace_runtime_pass = true; report.delivery_workspace_draft_only = true;
    report.delivery_workspace_private_approval_pass = true;
  } finally {
    for (const value of [env.SUPABASE_SERVICE_ROLE_KEY, env.NEXT_PUBLIC_SUPABASE_ANON_KEY]) if (value) log = log.replaceAll(value, '[redacted]');
    await writeFile(join(out, 'delivery-workspace-runtime.log'), log);
    for (const child of [server, approvalOffServer]) if (child) { child.kill('SIGTERM'); await Promise.race([once(child, 'exit'), new Promise(r => setTimeout(r, 5000))]); if (child.exitCode === null) child.kill('SIGKILL'); }
  }
}
