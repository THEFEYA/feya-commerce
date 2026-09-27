/** Owner-authorized visual review, 2026-09-24. Vercel Deployment Protection is
 * the access boundary for this one preview branch; this is not a public mode.
 * Only server-provided deployment metadata is accepted, never request headers.
 */
export function isOwnerPreviewDeployment(env: Record<string, string | undefined>) {
  return env.FEYA_OWNER_PREVIEW_DISABLED !== 'true'
    && env.VERCEL === '1'
    && env.VERCEL_ENV === 'preview'
    && env.VERCEL_PROJECT_ID === 'prj_ePIymo4sUG33wrRjHBxWrSlaxPID'
    && env.VERCEL_GIT_COMMIT_REF === 'work/search-architecture-foundation-20260923';
}

/** GET/HEAD tables and the two audited, read-only Product Truth RPCs only. */
export function ownerPreviewReadFetch(transport: typeof fetch, supabaseUrl: string): typeof fetch {
  const origin = new URL(supabaseUrl).origin;
  const readRpcs = new Set([
    '/rest/v1/rpc/feya_commerce_get_seo_product_truth_v4',
    '/rest/v1/rpc/feya_commerce_get_step7_storefront_products_api_v7',
  ]);
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const tableRead = /^\/rest\/v1\/[a-zA-Z0-9_]+$/.test(url.pathname) && ['GET', 'HEAD'].includes(method);
    const rpcRead = readRpcs.has(url.pathname) && ['GET', 'HEAD', 'POST'].includes(method);
    if (url.origin !== origin || url.username || url.password || (!tableRead && !rpcRead)) {
      return new Response(JSON.stringify({message: 'Предпросмотр: изменение данных выключено.', code: 'owner_preview_read_only'}), {
        status: 423, headers: {'Content-Type': 'application/json', 'Cache-Control': 'private, no-store'},
      });
    }
    return transport(input, {...init, cache: 'no-store', redirect: 'error'});
  };
}
