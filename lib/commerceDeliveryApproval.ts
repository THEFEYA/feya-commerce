import { parseDeliveryWorkspace, validateDeliveryAssignments, type DeliveryCatalogProduct, type DeliveryWorkspaceDraft } from './commerceDeliveryWorkspace.ts';
import { isFeyaBlockedExportDestination } from './commerceShippingBlockedDestinations.ts';

export const DELIVERY_APPROVAL_CONTRACT = 'commerce_delivery_approval_v1';
export const DELIVERY_READINESS_CONTRACT = 'commerce_delivery_approval_readiness_v1';
export type DeliveryApprovalIssue = { code: string; subject: string };
export type DeliveryApprovalReadiness = {
  contract_version: typeof DELIVERY_READINESS_CONTRACT; ready: boolean;
  configuration_count: number; issues: DeliveryApprovalIssue[]; issue_count: number;
  shipping_profile_ids: string[]; production_profile_ids: string[]; currencies: string[];
  public_rates_enabled: false; payment_enabled: false; provider_session_enabled: false;
};

/** Mechanical completeness for the current offer catalog; business approval is a separate owner action. */
export function deliveryApprovalReadiness(raw: unknown, catalog: DeliveryCatalogProduct[]): DeliveryApprovalReadiness {
  const issues: DeliveryApprovalIssue[] = []; let issueCount = 0, configurationCount = 0;
  const shipping = new Set<string>(), production = new Set<string>(), currencies = new Set<string>();
  const issueKeys = new Set<string>();
  const add = (code: string, subject: string, identity = subject) => {
    const key = `${code}:${identity}`; if (issueKeys.has(key)) return; issueKeys.add(key);
    issueCount++; if (issues.length < 200) issues.push({ code, subject });
  };
  const result = (): DeliveryApprovalReadiness => ({
    contract_version: DELIVERY_READINESS_CONTRACT, ready: issueCount === 0, configuration_count: configurationCount,
    issues, issue_count: issueCount, shipping_profile_ids: [...shipping].sort(), production_profile_ids: [...production].sort(),
    currencies: [...currencies].sort(), public_rates_enabled: false, payment_enabled: false, provider_session_enabled: false,
  });
  if (raw === null) { add('delivery_draft_save_required', 'Сохранённая версия'); return result(); }
  let draft: DeliveryWorkspaceDraft;
  try { draft = parseDeliveryWorkspace(raw); validateDeliveryAssignments(draft, catalog); }
  catch { add('delivery_draft_invalid', 'Сохранённая версия'); return result(); }
  if (!draft.scheduling_time_zone || !draft.cutoff_local) add('delivery_schedule_required', 'Часовой пояс и время окончания рабочего дня');
  if (!draft.dispatch_calendar) add('delivery_calendar_required', 'Календарь отправки');
  if (!draft.combination_rule) add('delivery_combination_rule_required', 'Правило объединения товаров в посылки');
  const assignments = new Map(draft.assignments.map(a => [`${a.canonical_product_id}:${a.configuration_price_id}`, a]));
  for (const product of catalog) for (const configuration of product.configurations) {
    // No active offer means this configuration is outside the current approval scope.
    if (!configuration.currencies.length) continue;
    configurationCount++;
    const subject = `${product.title} · ${configuration.name}`;
    const exact = assignments.get(`${product.canonical_product_id}:${configuration.configuration_price_id}`);
    const general = assignments.get(`${product.canonical_product_id}:null`);
    const sp = exact?.shipping_profile_id ?? general?.shipping_profile_id ?? draft.default_shipping_profile_id;
    const pp = exact?.production_profile_id ?? general?.production_profile_id ?? draft.default_production_profile_id;
    if (sp) shipping.add(sp); else add('delivery_profile_required', `Доставка: ${subject}`, configuration.configuration_price_id + ':shipping');
    if (pp) production.add(pp); else add('delivery_profile_required', `Изготовление: ${subject}`, configuration.configuration_price_id + ':production');
    if (configuration.currencies.length !== 1) add('delivery_offer_currency_unavailable', subject, configuration.configuration_price_id);
    else {
      currencies.add(configuration.currencies[0]);
      if (sp && draft.shipping_profiles.find(p => p.id === sp)?.currency !== configuration.currencies[0]) add('delivery_currency_mismatch', subject, configuration.configuration_price_id);
    }
  }
  if (!configurationCount) add('delivery_catalog_empty', 'Нет конфигураций с действующими предложениями');
  for (const profile of draft.production_profiles.filter(p => production.has(p.id))) {
    const subject = `Изготовление «${profile.name}»`;
    if (!profile.duration?.unit) add('delivery_day_basis_required', subject, profile.id);
    if (!profile.calendar) add('delivery_calendar_required', subject, profile.id);
    if (!profile.max_units_per_order) add('delivery_quantity_rule_required', subject, profile.id);
  }
  for (const profile of draft.shipping_profiles.filter(p => shipping.has(p.id))) {
    const subject = `Доставка «${profile.name}»`;
    if (!profile.served_countries.length) add('delivery_countries_required', subject, profile.id);
    if (!profile.max_units_per_parcel) add('delivery_quantity_rule_required', subject, profile.id);
    const ruleKeys = new Set<string>();
    for (const rule of profile.rules) {
      const ruleCountries = rule.scope === 'default' ? ['*'] : rule.countries;
      for (const country of ruleCountries) {
        const key = `${rule.scope}:${country}:${rule.postal_prefix || ''}`;
        if (ruleKeys.has(key)) add('delivery_rule_ambiguous', `${subject} · ${country}`, profile.id + ':' + key);
        ruleKeys.add(key);
      }
      for (const name of ['standard', 'express'] as const) {
        const method = rule[name]; if (!method) continue; // An explicit disabled method is valid.
        const label = `${subject} · ${rule.scope === 'default' ? 'базовая ставка' : rule.countries.join(', ')} · ${name === 'standard' ? 'стандартная' : 'экспресс'}`;
        const id = `${profile.id}:${rule.id}:${name}`;
        if (method.amount_minor === null) add('delivery_rate_missing', label, id);
        if (!method.transit?.unit) add('delivery_day_basis_required', label, id);
        if (!method.calendar) add('delivery_calendar_required', label, id);
      }
    }
    for (const country of profile.served_countries) {
      // An audited, versioned owner draft may predate a new carrier suspension.
      // This must be a release blocker even if rate rules match otherwise.
      if (isFeyaBlockedExportDestination(country)) {
        add('delivery_country_blocked', `${subject} · ${country}`, profile.id + ':blocked:' + country);
        continue;
      }
      const base = profile.rules.filter(r => r.scope === 'default' || r.scope !== 'postal_prefix' && r.countries.includes(country))
        .sort((a, b) => ({ country: 2, zone: 1, default: 0, postal_prefix: -1 }[b.scope] - { country: 2, zone: 1, default: 0, postal_prefix: -1 }[a.scope]))[0];
      if (!base || !base.standard && !base.express) add('delivery_country_rate_required', `${subject} · ${country}`, profile.id + ':' + country);
    }
  }
  return result();
}
