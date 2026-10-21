import 'server-only';
import type {NextRequest} from 'next/server';

export class BodyError extends Error {
  readonly status: number;
  constructor(code: string, status: number) { super(code); this.name = 'BodyError'; this.status = status; }
}

/** Reads a size-limited UTF-8 body without trusting Content-Length. */
export async function readLimitedText(request: NextRequest, maxBytes: number): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maxBytes) { await reader.cancel(); throw new BodyError('payload_too_large', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return new TextDecoder('utf-8', {fatal: true}).decode(bytes); }
  catch { throw new BodyError('invalid_encoding', 400); }
}

export async function readLimitedJson(request: NextRequest, maxBytes: number): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new BodyError('json_required', 415);
  const text = await readLimitedText(request, maxBytes);
  try { return JSON.parse(text); } catch { throw new BodyError('invalid_json', 400); }
}
