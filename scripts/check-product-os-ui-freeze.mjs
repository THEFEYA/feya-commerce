import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const manifestPath = resolve(process.cwd(), 'config/product-os-ui-freeze.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return createHash('sha1').update(header).update(buffer).digest('hex');
}

const failures = [];

const globalCssBaselinePath = resolve(process.cwd(), 'config/product-os-globals-baseline.css');
const globalCssPath = resolve(process.cwd(), 'app/globals.css');
if (!existsSync(globalCssBaselinePath) || !existsSync(globalCssPath)) {
  failures.push('global CSS baseline or app/globals.css is missing');
} else {
  const approvedPrefix = readFileSync(globalCssBaselinePath);
  const currentGlobalCss = readFileSync(globalCssPath);
  if (currentGlobalCss.length < approvedPrefix.length || !currentGlobalCss.subarray(0, approvedPrefix.length).equals(approvedPrefix)) {
    failures.push('app/globals.css: approved Product OS CSS prefix changed');
  }
}

for (const [relativePath, expectedSha] of Object.entries(manifest.files || {})) {
  const absolutePath = resolve(process.cwd(), relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`);
    continue;
  }

  const actualSha = gitBlobSha(readFileSync(absolutePath));
  if (actualSha !== expectedSha) {
    failures.push(`${relativePath}: expected ${expectedSha}, got ${actualSha}`);
  }
}

if (failures.length) {
  console.error('\nProduct OS visual freeze check failed.');
  console.error('These surfaces are owner-approved and outside the Company / AI UX redesign scope.\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nIf a visible Product OS change is explicitly approved, update the manifest in the same reviewed change.');
  process.exit(1);
}

console.log(`Product OS visual freeze: OK (${Object.keys(manifest.files || {}).length} files)`);
