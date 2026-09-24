import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextRequest } from 'next/server';
import { withInternalApi } from '../../lib/internalAuth.ts';
import { readInternalExecutionRequest } from '../../lib/internalExecutionRequest.ts';

function request(body?: string, query = '', method = 'POST', headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/internal/test' + query, {
    method, headers, ...(method === 'POST' && body !== undefined ? { body } : {}),
  }) as NextRequest;
}

test('Internal boundary denies before parsing or transport; supports both existing token headers', async () => {
  const previous = process.env.FEYA_INTERNAL_API_TOKEN;
  let calls = 0;
  const handler = withInternalApi(async () => { calls++; return Response.json({ ok: true }); });
  try {
    delete process.env.FEYA_INTERNAL_API_TOKEN;
    const absent = await handler(request('{'));
    assert.equal(absent.status, 503);
    assert.deepEqual(await absent.json(), { ok: false, code: 'internal_auth_unavailable' });
    process.env.FEYA_INTERNAL_API_TOKEN = 'fixture-secret-only';
    for (const headers of [{}, { authorization: 'Bearer wrong-secret-only' }, { 'x-feya-internal-token': 'é' }] as Record<string, string>[]) {
      const denied = await handler(request('{', '?token=fixture-secret-only', 'POST', headers));
      assert.equal(denied.status, 401);
      assert.match(denied.headers.get('cache-control')!, /private.*no-store/);
    }
    assert.equal(calls, 0);
    for (const headers of [{ authorization: 'Bearer fixture-secret-only' }, { 'x-feya-internal-token': 'fixture-secret-only' }] as Record<string, string>[]) {
      const allowed = await handler(request('{}', '', 'POST', headers));
      assert.equal(allowed.status, 200);
      assert.match(allowed.headers.get('cache-control')!, /private.*no-store/);
    }
    assert.equal(calls, 2);
  } finally {
    if (previous === undefined) delete process.env.FEYA_INTERNAL_API_TOKEN;
    else process.env.FEYA_INTERNAL_API_TOKEN = previous;
  }
});

test('Absent execution flag defaults to preview; explicit boolean false is accepted only on POST', async () => {
  for (const body of [undefined, '', '{}', '{"dryRun":true}', '{"dry_run":true}']) {
    const result = await readInternalExecutionRequest(request(body));
    assert.ok(result.ok); assert.equal(result.dryRun, true);
  }
  for (const body of ['{"dryRun":false}', '{"dry_run":false}', '{"dryRun":false,"dry_run":false}']) {
    const result = await readInternalExecutionRequest(request(body));
    assert.ok(result.ok); assert.equal(result.dryRun, false);
  }
});

test('Invalid JSON, non-object bodies and boolean coercion cannot trigger effects', async () => {
  for (const body of ['{', 'null', '[]', 'false', '0', '""', '{"dryRun":"false"}', '{"dry_run":0}', '{"dryRun":null}', '{"dryRun":[]}']) {
    const result = await readInternalExecutionRequest(request(body));
    assert.equal(result.ok, false, body);
    if (!result.ok) assert.equal(result.response.status, 400);
  }
});

test('Contradictory, repeated or misspelled query execution flags are rejected', async () => {
  for (const [body, query] of [
    ['{"dryRun":true,"dry_run":false}', ''],
    ['{"dryRun":true}', '?dry_run=false'],
    ['{}', '?dryRun=flase'], ['{}', '?dry_run='], ['{}', '?dry_run=0'],
    ['{}', '?dryRun=true&dryRun=false'], ['{}', '?dry_run=true&dryRun=false'],
  ]) {
    const result = await readInternalExecutionRequest(request(body, query), { queryDryRun: true });
    assert.equal(result.ok, false, query || body);
    if (!result.ok) assert.equal(result.response.status, 400);
  }
  const unsupported = await readInternalExecutionRequest(request('{}', '?dryRun=false'));
  assert.equal(unsupported.ok, false);
});

test('GET cannot perform metric ingestion; valid preview queries preserve compatibility', async () => {
  for (const key of ['dryRun', 'dry_run']) {
    const result = await readInternalExecutionRequest(request(undefined, `?${key}=false`, 'GET'), { queryDryRun: true });
    assert.equal(result.ok, false);
    if (!result.ok) { assert.equal(result.response.status, 405); assert.equal(result.response.headers.get('allow'), 'POST'); }
  }
  for (const query of ['', '?dryRun=true', '?dry_run=true&dryRun=true']) {
    const result = await readInternalExecutionRequest(request(undefined, query, 'GET'), { queryDryRun: true });
    assert.ok(result.ok); assert.equal(result.dryRun, true);
  }
});
