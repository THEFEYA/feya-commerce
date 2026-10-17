/** Matched timings for the existing catalog PostgREST read; no URLs, auth or bodies logged. */
export type CatalogSourceTiming = {
 responseCount: number;
 headerWaitMs: number | null;
 gatewayUpstreamMs: number | null;
};

export function newCatalogSourceTiming(): CatalogSourceTiming {
 return { responseCount: 0, headerWaitMs: null, gatewayUpstreamMs: null };
}

export function readGatewayUpstreamMs(value: string | null): number | null {
 if (!value || !/^[0-9]{1,5}$/.test(value)) return null;
 const n = Number(value);
 return Number.isSafeInteger(n) && n <= 60000 ? n : null;
}

/** Preserve original fetch input, response and body stream, without retry or buffering. */
export function createTimedCatalogFetch(timing: CatalogSourceTiming, baseFetch: typeof fetch): typeof fetch {
 return async (input, init) => {
   const start = Date.now();
   const response = await baseFetch(input, init);
   timing.responseCount += 1;
   timing.headerWaitMs = Math.max(0, Date.now() - start);
   timing.gatewayUpstreamMs = readGatewayUpstreamMs(response.headers.get('x-envoy-upstream-service-time'));
   return response;
 };
}

export function catalogSourceTimingFields(timing: CatalogSourceTiming, elapsedMs: number) {
 // Multiple HTTP requests are not attributable to one source read.
 const attributable=timing.responseCount === 1
   && typeof timing.headerWaitMs === 'number'
   && Number.isFinite(elapsedMs) && elapsedMs >= 0;
 const fetchHeadersMs=attributable ? Math.min(elapsedMs,timing.headerWaitMs!) : null;
 return {
   fetch_headers_ms: fetchHeadersMs,
   gateway_upstream_ms: attributable ? timing.gatewayUpstreamMs : null,
   // Includes body transfer, JSON decode and library work; not network-only.
   post_headers_ms: fetchHeadersMs === null ? null : Math.max(0,elapsedMs-fetchHeadersMs),
 };
}
