import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const requiredFiles = [
  'app/admin/company/page.tsx',
  'app/admin/company/work/page.tsx',
  'app/admin/company/growth/page.tsx',
  'app/admin/company/results/page.tsx',
  'app/admin/company/system/page.tsx',
  'app/admin/company/search/page.tsx',
  'app/admin/roles/page.tsx',
  'components/admin/OwnerShell.tsx',
  'components/admin/AdminLegacyShell.tsx',
  'docs/OWNER_UX_BLUEPRINT_AUDIT_2026-09-19.md',
];

const failures = [];
for (const file of requiredFiles) {
  if (!existsSync(resolve(process.cwd(), file))) failures.push(`missing required owner UI file: ${file}`);
}

function text(file) {
  return readFileSync(resolve(process.cwd(), file), 'utf8');
}

if (!failures.length) {
  const shell = text('components/admin/OwnerShell.tsx');
  const legacy = text('components/admin/AdminLegacyShell.tsx');
  const audit = text('docs/OWNER_UX_BLUEPRINT_AUDIT_2026-09-19.md');

  for (const label of ['Сегодня', 'Работа', 'Рост', 'Товары', 'Результаты', 'Система']) {
    if (!shell.includes(`label: '${label}'`)) failures.push(`OwnerShell missing primary destination: ${label}`);
  }

  for (const label of ['Сегодня', 'Работа', 'Найти', 'Товары', 'Ещё']) {
    if (!shell.includes(`<small>${label}</small>`)) failures.push(`OwnerShell mobile nav missing: ${label}`);
  }

  if (shell.includes('WORK_TOOLS')) failures.push('OwnerShell must not embed Product OS tool navigation.');
  if (!legacy.includes('Existing Product OS keeps its approved visual/workflow shell unchanged')) {
    failures.push('AdminLegacyShell no longer documents Product OS scope isolation.');
  }
  if (!legacy.includes('isAgentOwnerRoute')) failures.push('AdminLegacyShell missing agent-route isolation.');
  if (!audit.includes('Scope correction — Owner review')) failures.push('Owner UX audit missing scope correction.');
  if (!audit.includes('FROZEN / APPROVED')) failures.push('Owner UX audit no longer marks Product OS frozen.');

  const companyFiles = [
    'app/admin/company/page.tsx',
    'app/admin/company/work/page.tsx',
    'app/admin/company/growth/page.tsx',
    'app/admin/company/results/page.tsx',
    'app/admin/company/system/page.tsx',
  ];
  const forbiddenOwnerClaims = [
    'conversion rate',
    'revenue growth',
    'overallScore',
    'confidence score',
  ];
  for (const file of companyFiles) {
    const source = text(file).toLowerCase();
    for (const phrase of forbiddenOwnerClaims) {
      if (source.includes(phrase.toLowerCase())) failures.push(`${file}: forbidden synthetic owner claim "${phrase}"`);
    }
  }
}

if (failures.length) {
  console.error('\nOwner UI contract check failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Owner UI contract: OK');
