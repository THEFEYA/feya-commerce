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
  'components/admin/OwnerWorkDrawerClient.tsx',
  'components/admin/OwnerSignalDrawerClient.tsx',
  'components/admin/OwnerRoleDrawerClient.tsx',
  'docs/OWNER_UX_BLUEPRINT_AUDIT_2026-09-19.md',
  'docs/OWNER_COMPANY_VISUAL_CONTRACT_V1.md',
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

  const frozenProductPrefixes = [
    '/admin/listing-master',
    '/admin/products',
    '/admin/review',
    '/admin/media',
    '/admin/media-seo',
    '/admin/seo-lab',
    '/admin/seo-engine',
    '/admin/seo-keywords',
    '/admin/seo-approval',
    '/admin/seo-export',
    '/admin/seo-apply',
    '/admin/seo-change-sets',
    '/admin/seo-applied-values',
    '/admin/seo-storefront-preview',
    '/admin/seo-gate',
    '/admin/content',
    '/admin/collections',
    '/admin/graph',
    '/admin/launch',
    '/admin/indexation',
    '/admin/orders',
  ];

  const prefixBlock = legacy.match(/const AGENT_OWNER_PREFIXES = \[([\s\S]*?)\] as const;/)?.[1] || '';
  for (const prefix of frozenProductPrefixes) {
    if (prefixBlock.includes(`'${prefix}'`)) {
      failures.push(`AdminLegacyShell must not wrap frozen Product OS route with OwnerShell: ${prefix}`);
    }
  }

  if (!audit.includes('Scope correction — Owner review')) failures.push('Owner UX audit missing scope correction.');
  if (!audit.includes('FROZEN / APPROVED')) failures.push('Owner UX audit no longer marks Product OS frozen.');

  const today = text('app/admin/company/page.tsx');
  const work = text('app/admin/company/work/page.tsx');
  const signals = text('app/admin/company/signals/page.tsx');
  const visualContract = text('docs/OWNER_COMPANY_VISUAL_CONTRACT_V1.md');

  const todayOrder = [
    'owner-command-brief',
    'Нужно ваше решение',
    'Что существенно изменилось',
    'Возможности',
    'В работе',
    'Состояние системы',
    'Для сведения',
  ];
  let previousIndex = -1;
  for (const marker of todayOrder) {
    const index = today.indexOf(marker);
    if (index === -1) {
      if (marker !== 'Возможности') failures.push(`Today missing research section: ${marker}`);
      continue;
    }
    if (index < previousIndex) failures.push(`Today research order is broken at: ${marker}`);
    previousIndex = index;
  }

  if (!work.includes('OwnerWorkDrawerClient')) failures.push('Work must use context-first drawer detail.');
  if (!work.includes('OwnerRoleDrawerClient')) failures.push('Team FEYA must use contextual role detail.');
  if (!signals.includes('OwnerSignalDrawerClient')) failures.push('Signals must use evidence-first drawer detail.');
  if (!visualContract.includes('Product OS and public storefront are visually frozen')) failures.push('Visual contract lost Product OS freeze.');
  if (!visualContract.includes('No fake revenue, conversion, ranking')) failures.push('Visual contract lost no-fake-analytics rule.');

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
