import {createPublicKey, verify, type JsonWebKey} from 'node:crypto';

const googleKeysUrl = 'https://www.googleapis.com/oauth2/v3/certs';
const googleIssuers = new Set(['accounts.google.com', 'https://accounts.google.com']);
const studioEmail = 'manager.feya@gmail.com';
type GoogleKey = JsonWebKey & {kid: string; alg: string; use: string};
type KeySet = {keys: GoogleKey[]; validUntil: number};

let cachedKeys: KeySet | undefined;
let loading: Promise<KeySet> | undefined;

async function fetchSigningKeys(): Promise<KeySet> {
  // Fixed Google public keys endpoint. A bearer token is never sent to Google or put in an address.
  const response = await fetch(googleKeysUrl, {redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(3500)});
  if (!response.ok) throw new Error('worker_identity_unavailable');
  const data = await response.json() as {keys?: GoogleKey[]};
  const keys = data.keys?.filter(key => key.kty === 'RSA' && key.use === 'sig' && key.alg === 'RS256'
    && typeof key.kid === 'string' && typeof key.n === 'string' && typeof key.e === 'string');
  if (!keys?.length) throw new Error('worker_identity_unavailable');
  const maxAge = /(?:^|,)\s*max-age=(\d+)/i.exec(response.headers.get('cache-control') ?? '');
  const lifetime = Math.min(3600, Number(maxAge?.[1] ?? 300));
  return {keys, validUntil: Date.now() + lifetime * 1000};
}

async function googleSigningKey(id: string): Promise<GoogleKey | undefined> {
  if (!cachedKeys || cachedKeys.validUntil <= Date.now()) {
    // Coalesce network lookups, including requests carrying a forged or unknown key ID.
    loading ??= fetchSigningKeys();
    try {cachedKeys = await loading;} finally {loading = undefined;}
  }
  return cachedKeys.keys.find(key => key.kid === id);
}

function tokenPart(encoded: string): Record<string, unknown> | null {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return decoded && typeof decoded === 'object' && !Array.isArray(decoded) ? decoded as Record<string, unknown> : null;
  } catch {return null;}
}

/** Pin the exact private Apps Script client as well as the studio account. */
export async function authorizedWithdrawalWorker(
  authorization: string | null,
  audience: string,
  lookup: (id: string) => Promise<JsonWebKey | undefined> = googleSigningKey,
  now = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  if (!authorization || authorization.length > 5000 || !authorization.startsWith('Bearer ')) return false;
  const parts = authorization.slice(7).split('.');
  if (parts.length !== 3 || parts.some(part => !/^[a-z0-9_-]+$/i.test(part))) return false;
  const header = tokenPart(parts[0]), claims = tokenPart(parts[1]);
  if (header?.alg !== 'RS256' || header.crit !== undefined || typeof header.kid !== 'string'
      || !/^[A-Za-z0-9_-]{1,160}$/.test(header.kid) || !claims) return false;
  if (typeof claims.iss !== 'string' || !googleIssuers.has(claims.iss) || claims.aud !== audience
      || (claims.azp !== undefined && claims.azp !== audience)
      || claims.email !== studioEmail || claims.email_verified !== true || typeof claims.sub !== 'string' || !claims.sub
      || typeof claims.exp !== 'number' || !Number.isInteger(claims.exp) || claims.exp <= now || claims.exp > now + 7200
      || typeof claims.iat !== 'number' || !Number.isInteger(claims.iat) || claims.iat > now + 60 || claims.iat < now - 7200
      || claims.exp <= claims.iat || (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || claims.nbf > now + 60))) return false;
  const key = await lookup(header.kid);
  if (!key) return false;
  return verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), createPublicKey({key, format: 'jwk'}),
    Buffer.from(parts[2], 'base64url'));
}
