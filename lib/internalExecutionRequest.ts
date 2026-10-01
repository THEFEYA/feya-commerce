type ExecutionInput = {
  ok: true;
  body: Record<string, unknown>;
  dryRun: boolean;
} | { ok: false; response: Response };

function invalid(code: string, status = 400): ExecutionInput {
  return {
    ok: false,
    response: Response.json({ ok: false, code }, {
      status,
      headers: { 'Cache-Control': 'private, no-store', ...(status === 405 ? { Allow: 'POST' } : {}) },
    }),
  };
}

/** Invalid/ambiguous input must never opt into effects. Call only AFTER authentication. */
export async function readInternalExecutionRequest(
  request: Request,
  options: { queryDryRun?: boolean } = {},
): Promise<ExecutionInput> {
  let body: Record<string, unknown> = {};
  if (request.method === 'POST') {
    let parsed: unknown;
    try {
      const text = await request.text();
      parsed = text.trim() ? JSON.parse(text) : {};
    } catch { return invalid('invalid_json'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return invalid('json_object_required');
    body = parsed as Record<string, unknown>;
  }

  const flags: boolean[] = [];
  const query = new URL(request.url).searchParams;
  for (const key of ['dryRun', 'dry_run']) {
    if (Object.hasOwn(body, key)) {
      if (typeof body[key] !== 'boolean') return invalid('dry_run_must_be_boolean');
      flags.push(body[key]);
    }
    const values = query.getAll(key);
    if (!values.length) continue;
    if (!options.queryDryRun) return invalid('dry_run_query_not_supported');
    if (values.length !== 1 || !['true', 'false'].includes(values[0])) return invalid('invalid_dry_run_query');
    flags.push(values[0] === 'true');
  }
  if (flags.some(value => value !== flags[0])) return invalid('conflicting_dry_run_flags');
  const dryRun = flags[0] ?? true;
  if (request.method !== 'POST' && !dryRun) return invalid('execution_requires_post', 405);
  return { ok: true, body, dryRun };
}
