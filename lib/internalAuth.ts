import type { NextRequest } from 'next/server';

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
    authorized: providedToken === configuredToken,
  };
}
