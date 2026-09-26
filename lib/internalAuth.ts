import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

function tokensMatch(providedToken: string | undefined, configuredToken: string) {
  if (!providedToken) return false;
  const provided = Buffer.from(providedToken, 'utf8');
  const configured = Buffer.from(configuredToken, 'utf8');
  if (provided.length !== configured.length) return false;
  return timingSafeEqual(provided, configured);
}

export function isInternalApiTokenConfigured() {
  return Boolean(process.env.FEYA_INTERNAL_API_TOKEN);
}

export function getInternalApiAuthStatus(request: NextRequest) {
  const configuredToken = process.env.FEYA_INTERNAL_API_TOKEN;

  if (!configuredToken) {
    return { configured: false, authorized: false };
  }

  const authorization = request.headers.get('authorization');
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const headerToken = request.headers.get('x-feya-internal-token')?.trim();
  const providedToken = bearerToken || headerToken;

  return {
    configured: true,
    authorized: tokensMatch(providedToken, configuredToken),
  };
}

/** Authentication of an internal caller is not an owner approval or agent capability. */
export function withInternalApi(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const auth = getInternalApiAuthStatus(request);
    if (!auth.configured || !auth.authorized) {
      return Response.json(
        { ok: false, code: auth.configured ? 'internal_auth_required' : 'internal_auth_unavailable' },
        { status: auth.configured ? 401 : 503, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    const response = await handler(request);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
}
