import structureAudit from '../../docs/search/configuration-binding-audit-20260925.json' with {type:'json'};

type Row = Record<string, unknown>;

export type CommerceExecutionApprovalVM = {
  id: string;
  sourceCode: string;
  priorityLabel: string;
  tone: 'warning';
  typeLabel: string;
  title: string;
  whyNow: string;
  requiredAction: string;
  statusLabel: string;
  dueAt: null;
  href: string;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function payload(row: Row): Record<string, unknown> {
  const value = row.request_payload_json;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function number(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ids(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).length : 0;
}

export function presentCommerceExecutionApproval(row: Row): CommerceExecutionApprovalVM | null {
  const actionCode = text(row.action_code).toUpperCase();
  const requestId = text(row.execution_request_id);
  const data = payload(row);
  if (!requestId) return null;

  if (actionCode === 'ADOPT_SOURCE_PRICE_BASELINE') {
    const products = ids(data.canonical_product_ids);
    const prices = number(data.price_row_count);
    const expectedProducts=Number((structureAudit as any).clean_configuration_baseline_products_after_repair||0);
    const expectedPrices=Number((structureAudit as any).clean_configuration_baseline_price_rows_after_repair||0);
    if(products!==expectedProducts||prices!==expectedPrices)return null;
    return {
      id: `execution:${requestId}`,
      sourceCode: actionCode,
      priorityLabel: 'Важно',
      tone: 'warning',
      typeLabel: 'Подтверждение',
      title: 'Подтвердить базовые цены launch-каталога',
      whyNow: `Подготовлен точный unchanged-source batch${products ? ` для ${products} товаров` : ''}${prices ? ` / ${prices} цен` : ''}. Без подтверждения эти цены не могут стать authority для variants, offers и server quote.`,
      requiredAction: 'Открыть проверку цен, сверить exact batch и подтвердить его только если scope и evidence совпадают.',
      statusLabel: 'Открыто',
      dueAt: null,
      href: '/admin/review/prices#baseline-adoption',
    };
  }

  if (actionCode === 'REPAIR_RELEASE_CONFIGURATION_BINDINGS') {
    const products = ids(data.canonical_product_ids);
    const rows = number(data.expected_rebind_rows);
    const create = number(data.expected_create_configurations);
    return {
      id: `execution:${requestId}`,
      sourceCode: actionCode,
      priorityLabel: 'Важно',
      tone: 'warning',
      typeLabel: 'Подтверждение',
      title: 'Исправить configuration identities launch-каталога',
      whyNow: `Полный production-аудит обнаружил catalog-wide structural defect: ${rows || 631} configuration-axis price rows привязаны к неверным sellable configuration identities. Repair охватывает ${products || 207} launch-товаров и создаёт ${create || 631} недостающих identities без изменения цен.`,
      requiredAction: 'Открыть проверку цен, сверить exact structural evidence и подтвердить atomic rebinding. Три color-price товара останутся отдельным HOLD.',
      statusLabel: 'Открыто',
      dueAt: null,
      href: '/admin/company/commerce-configuration-repair',
    };
  }

  if (actionCode === 'REPAIR_MANUAL_CONFIGURATION_BINDINGS') {
    // Superseded by catalog-wide configuration repair; keep historical request in DB but do not surface it as actionable.
    return null;
  }

  if (actionCode === 'ADOPT_MANUAL_PRICE_LANE_GOVERNANCE') {
    const prices = number(data.expected_price_rows);
    const configs = number(data.expected_configuration_rows);
    return {
      id: `execution:${requestId}`,
      sourceCode: actionCode,
      priorityLabel: 'Важно',
      tone: 'warning',
      typeLabel: 'Подтверждение',
      title: 'Подтвердить финальный governance manual-price товаров',
      whyNow: `После structural repair готов exact governance${prices ? ` для ${prices} цен` : ''}${configs ? ` / ${configs} configurations` : ''}. Owner override prices сохраняются без изменения.`,
      requiredAction: 'Проверить post-repair evidence и подтвердить governance перед созданием authoritative variants/offers.',
      statusLabel: 'Открыто',
      dueAt: null,
      href: '/admin/review/prices#manual-price-governance',
    };
  }

  return null;
}

export function presentCommerceExecutionApprovals(rows: Row[]) {
  return rows
    .map(presentCommerceExecutionApproval)
    .filter((item): item is CommerceExecutionApprovalVM => Boolean(item));
}
