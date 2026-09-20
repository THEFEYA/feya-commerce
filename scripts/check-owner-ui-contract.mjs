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
  'components/admin/OwnerOpportunityDrawerClient.tsx',
  'components/admin/OwnerExperimentDrawerClient.tsx',
  'components/admin/OwnerIncidentDrawerClient.tsx',
  'components/admin/OwnerExecutionDrawerClient.tsx',
  'components/admin/OwnerDataSourceDrawerClient.tsx',
  'components/admin/OwnerLearningDrawerClient.tsx',
  'components/admin/OwnerContentBriefDrawerClient.tsx',
  'components/admin/OwnerContentQaDrawerClient.tsx',
  'components/admin/OwnerProductFactDrawerClient.tsx',
  'components/admin/OwnerInitiativeDrawerClient.tsx',
  'components/admin/OwnerObjectiveDrawerClient.tsx',
  'components/admin/OwnerAttentionDecisionClient.tsx',
  'lib/ownerActionAuth.ts',
  'app/api/admin/company/owner-attention/decision/route.ts',
  'docs/OWNER_UX_BLUEPRINT_AUDIT_2026-09-19.md',
  'docs/OWNER_FUNCTIONAL_COVERAGE_2026-09-20.md',
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
  const growth = text('app/admin/company/growth/page.tsx');
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


  const strategy = text('app/admin/strategy/page.tsx');
  const opportunities = text('app/admin/opportunities/page.tsx');
  const experiments = text('app/admin/experiments/page.tsx');
  const executions = text('app/admin/executions/page.tsx');
  const incidents = text('app/admin/incidents/page.tsx');
  const dataHealth = text('app/admin/data-health/page.tsx');
  const learning = text('app/admin/learning/page.tsx');
  const contentBriefs = text('app/admin/content-briefs/page.tsx');
  const contentQa = text('app/admin/content-qa/page.tsx');
  const productFacts = text('app/admin/product-facts-review/page.tsx');
  const results = text('app/admin/company/results/page.tsx');
  const coverage = text('docs/OWNER_FUNCTIONAL_COVERAGE_2026-09-20.md');

  if (!work.includes('feya_commerce_v_growth_handoffs_safe_v1')) {
    failures.push('Work must read durable handoffs through the governed safe projection.');
  }
  if (!work.includes('feya_commerce_v_growth_workflow_events_safe_v1')) {
    failures.push('Work must read durable workflow events through the governed safe projection.');
  }
  if (!growth.includes('feya_commerce_v_growth_objectives_safe_v1')) {
    failures.push('Growth must expose Growth Objectives through the governed safe projection.');
  }
  if (!strategy.includes('OwnerObjectiveDrawerClient')) failures.push('Strategy must expose Growth Objective context.');
  if (!strategy.includes('OwnerInitiativeDrawerClient')) failures.push('Strategy must expose initiative governance context.');
  if (!opportunities.includes('OwnerOpportunityDrawerClient')) failures.push('Opportunities must use context-first detail.');
  if (!experiments.includes('OwnerExperimentDrawerClient')) failures.push('Experiments must use evidence-first context detail.');
  if (!executions.includes('OwnerExecutionDrawerClient')) failures.push('Execution must distinguish request/approval/receipt in context.');
  if (!incidents.includes('OwnerIncidentDrawerClient')) failures.push('Incidents must expose mutation-freeze context.');
  if (!dataHealth.includes('OwnerDataSourceDrawerClient')) failures.push('Data Health must expose source freshness/authority context.');
  if (!learning.includes('OwnerLearningDrawerClient')) failures.push('Learning must expose evidence maturity context.');
  if (!contentBriefs.includes('OwnerContentBriefDrawerClient')) failures.push('Content briefs must expose compiler readiness context.');
  if (!contentQa.includes('OwnerContentQaDrawerClient')) failures.push('CQA must expose independent validation context.');
  if (!productFacts.includes('OwnerProductFactDrawerClient')) failures.push('Product Truth review must expose ambiguity context.');
  if (!results.includes('/admin/company/results/changes')) failures.push('Results must route change history to the owner-facing Changes surface.');
  const ownerAttentionDetail = text('app/admin/company/owner-attention/[id]/page.tsx');
  const ownerActionAuth = text('lib/ownerActionAuth.ts');
  const ownerActionRoute = text('app/api/admin/company/owner-attention/decision/route.ts');
  if (!ownerAttentionDetail.includes('OwnerAttentionDecisionClient')) failures.push('Owner Attention detail must use the protected decision component.');
  if (!ownerActionAuth.includes('FEYA_OWNER_ACTIONS_ENABLED')) failures.push('Owner Action gate must keep an independent circuit breaker.');
  if (!ownerActionRoute.includes('requireOwnerActionActor')) failures.push('Owner Action API must require server-side owner authority.');
  if (!ownerActionRoute.includes('feya_fn_transition_owner_attention_v1')) failures.push('Owner Attention action must use the guarded RPC, not direct table mutation.');

  if (!coverage.includes('Handoff timeline') || !coverage.includes('COVERED')) {
    failures.push('Functional coverage map must record durable handoff coverage.');
  }
  if (!coverage.includes('Growth Objective')) failures.push('Functional coverage map must include Growth Objectives.');

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
