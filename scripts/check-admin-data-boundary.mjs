import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ADMIN_ROOT = path.join(ROOT, 'app', 'admin');
const COMPONENT_ROOT = path.join(ROOT, 'components');
const ALLOWED_RAW_READ_FILES = new Set([
  path.join(ROOT, 'lib', 'adminData.ts'),
  path.join(ROOT, 'lib', 'supabase.ts'),
]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) ? [full] : [];
  });
}

const errors = [];

for (const file of walk(ADMIN_ROOT)) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('getSupabaseReadClient')) {
    errors.push(`${path.relative(ROOT, file)} uses getSupabaseReadClient directly. Admin reads must go through getAdminReadClient or a service-only server path.`);
  }
  if (source.includes('@/lib/supabaseAdmin')) {
    errors.push(`${path.relative(ROOT, file)} imports the unscoped internal executor; use session-guarded adminData/supabase instead.`);
  }

  if (source.startsWith("'use client'") || source.startsWith('"use client"')) {
    if (
      source.includes('SUPABASE_SERVICE_ROLE_KEY') ||
      source.includes('getSupabaseServiceClient') ||
      source.includes('getSupabaseServiceRoleClient') ||
      source.includes('@/lib/adminData')
    ) {
      errors.push(`${path.relative(ROOT, file)} is a client module with privileged/server admin access.`);
    }
  }
}

for (const file of walk(COMPONENT_ROOT)) {
  const source = fs.readFileSync(file, 'utf8');
  if (!(source.startsWith("'use client'") || source.startsWith('"use client"'))) continue;

  if (
    source.includes('SUPABASE_SERVICE_ROLE_KEY') ||
    source.includes('getSupabaseServiceClient') ||
    source.includes('getSupabaseServiceRoleClient') ||
    source.includes('@/lib/adminData')
  ) {
    errors.push(`${path.relative(ROOT, file)} is a client component with privileged/server admin access.`);
  }
}

for (const file of ALLOWED_RAW_READ_FILES) {
  if (!fs.existsSync(file)) {
    errors.push(`${path.relative(ROOT, file)} is missing; admin boundary helper contract is incomplete.`);
  }
}

for (const relative of ['lib/adminData.ts', 'lib/adminServerData.ts', 'lib/supabase.ts', 'lib/supabaseAdmin.ts']) {
  const source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  if (!source.includes("import 'server-only'")) errors.push(`${relative} must be server-only.`);
}
for (const relative of ['lib/adminData.ts', 'lib/seoBriefContractServer.ts']) {
  if (fs.readFileSync(path.join(ROOT, relative), 'utf8').includes('getSupabaseReadClient')) errors.push(`${relative} must not fall back to anonymous reads.`);
}
for (const file of walk(path.join(ROOT, 'app/api/admin'))) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('@/lib/supabaseAdmin') || source.includes('getSupabaseReadClient')) errors.push(`${path.relative(ROOT, file)} bypasses the admin session data boundary.`);
}

const middlewarePath = path.join(ROOT, 'middleware.ts');
const middleware = fs.existsSync(middlewarePath) ? fs.readFileSync(middlewarePath, 'utf8') : '';
if (!middleware.includes("'/api/admin/:path*'") || !middleware.includes("'/admin/:path*'")) {
  errors.push('middleware.ts must protect both /admin/:path* and /api/admin/:path*.');
}

if (errors.length) {
  console.error('\nFEYA admin data-boundary check FAILED:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('FEYA admin data-boundary check PASS');
