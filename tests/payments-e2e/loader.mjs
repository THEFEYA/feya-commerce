// Node module resolution hook for the payments end-to-end test:
//  - "@/..." → repository files (.ts/.tsx)
//  - framework / SaaS modules → local test doubles in ./stubs
import {existsSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const stubs = path.join(root, 'tests/payments-e2e/stubs');
const STUBBED = {
  'server-only': 'server-only.mjs',
  'next/cache': 'next-cache.mjs',
  '@supabase/supabase-js': 'supabase.mjs',
  '@/lib/storefrontProductPresentationServer': 'storefront-presentation.mjs',
};

function withExtension(base) {
  for (const candidate of [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) {
    if (existsSync(candidate) && !candidate.endsWith(path.sep)) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (STUBBED[specifier]) return {url: pathToFileURL(path.join(stubs, STUBBED[specifier])).href, shortCircuit: true};
  if (specifier.startsWith('@/')) {
    const file = withExtension(path.join(root, specifier.slice(2)));
    if (file) return {url: pathToFileURL(file).href, shortCircuit: true};
  }
  return next(specifier, context);
}
