import type { VariantSnapshot, VariantAttribute, VariantSelection } from './commerceVariantContract.ts';
import { parseVariantDraftInput, type VariantDraftInput } from './commerceVariantDraftSchema.ts';
import { parseVariantDraftContext, type VariantDraftContext } from './commerceVariantDraftStorage.ts';

export type VariantEditorContext = VariantDraftContext & { editor_actor_id: string };
export const editorUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
export function parseVariantEditorContext(value: unknown, productId: string): VariantEditorContext {
  const context = parseVariantDraftContext(value, productId);
  const actor = (value as Record<string, unknown>).editor_actor_id;
  if (!editorUuid(actor)) throw new Error('Не удалось проверить пользователя редактора.');
  return { ...context, editor_actor_id: actor };
}
export function editorSnapshot(context: VariantDraftContext): VariantSnapshot {
  return context.snapshot ? structuredClone(context.snapshot) : { canonical_product_id: context.canonical_product_id,
    product_revision: 1, pricing_policy_ref: 'owner-configuration-base-price-20260924-04', configurations: [], colors: [], sizes: [], variants: [] };
}
export function addEditorConfiguration(snapshot: VariantSnapshot, context: VariantDraftContext, priceId: string, quoteId: string): VariantSnapshot {
  if (snapshot.configurations.some(c => c.configuration_price_id === priceId)) throw new Error('Эта комплектация уже добавлена.');
  const source = context.configuration_context.find(c => c.configuration_price_id === priceId);
  const binding = context.source_bindings.configurations.find(c => c.configuration_price_id === priceId);
  if (!source || !binding || !/^[A-Z]{3}$/.test(source.source_currency || '')) throw new Error('У комплектации нет проверяемой привязки валюты.');
  const next = structuredClone(snapshot);
  next.configurations.push({ configuration_price_id: priceId, sellable_configuration_id: binding.sellable_configuration_id,
    base_price: { quote_id: quoteId, price_revision: 1, status: 'unverified', amount_minor: null, currency: source.source_currency!,
      evidence_ref: `configuration_price:${priceId}@${binding.price_fingerprint}` } });
  // Source amounts remain context only. No inferred precedence, range minimum or conversion is saved as an exact price.
  return next;
}
const normalized = (label: string) => label.normalize('NFKC').trim().toLowerCase();
export function addEditorAttribute(snapshot: VariantSnapshot, dimension: 'colors' | 'sizes', label: string, id: string): VariantSnapshot {
  if (!label.trim() || label.trim().length > 140) throw new Error('Укажите название длиной от 1 до 140 символов.');
  if (snapshot[dimension].some(a => normalized(a.label) === normalized(label))) throw new Error('Такое название уже есть. Используйте существующую запись.');
  if (snapshot[dimension].length >= 64) throw new Error('Достигнут предел значений для этого товара.');
  const next = structuredClone(snapshot); next[dimension].push({ id, label: label.trim(), state: 'proposed' }); return next;
}
export function updateEditorAttribute(snapshot: VariantSnapshot, dimension: 'colors' | 'sizes', id: string, patch: Partial<Pick<VariantAttribute,'label'|'state'>>): VariantSnapshot {
  const next = structuredClone(snapshot), attr = next[dimension].find(a => a.id === id);
  if (!attr) throw new Error('Значение не найдено.');
  Object.assign(attr, patch);
  if (patch.state === 'retired') for (const variant of next.variants) {
    if (variant[dimension === 'colors' ? 'color_id' : 'size_id'] === id) variant.state = 'retired';
  }
  return next;
}
export function addEditorVariant(snapshot: VariantSnapshot, selection: VariantSelection, id: string): VariantSnapshot {
  if (!snapshot.configurations.some(c => c.configuration_price_id === selection.configuration_price_id)) throw new Error('Выберите комплектацию.');
  for (const [attributeId, values] of [[selection.color_id,snapshot.colors],[selection.size_id,snapshot.sizes]] as const)
    if (attributeId !== null && !values.some(a => a.id === attributeId && a.state !== 'retired')) throw new Error('Выберите действующий цвет и размер либо «Не применяется».');
  if (snapshot.variants.some(v => v.configuration_price_id === selection.configuration_price_id && v.color_id === selection.color_id && v.size_id === selection.size_id))
    throw new Error('Такое сочетание уже есть. Его ID сохранён, в том числе в архиве.');
  if (snapshot.variants.length >= 512) throw new Error('Достигнут предел сочетаний для этого товара.');
  const next = structuredClone(snapshot); next.variants.push({ ...selection, variant_id:id, state:'draft', pricing:{mode:'configuration_base'} }); return next;
}
export function prepareEditorSave(context: VariantEditorContext, snapshot: VariantSnapshot, requestId: string): VariantDraftInput {
  const next = structuredClone(snapshot); next.product_revision = context.current_revision + 1;
  for (const dimension of ['colors','sizes'] as const) {
    const labels = next[dimension].map(a => normalized(a.label));
    if (new Set(labels).size !== labels.length) throw new Error('Названия цветов и размеров должны различаться внутри каждой группы.');
  }
  return parseVariantDraftInput({ contract_version:'product_variant_draft_v1', request_id:requestId,
    expected_revision:context.current_revision, source_bindings:context.source_bindings, snapshot:next }, context.canonical_product_id);
}
export const pendingVariantKey = (actorId: string, productId: string) => `feya.variant.pending.v1:${actorId}:${productId}`;
export function serializePendingVariant(context: VariantEditorContext, request: VariantDraftInput): string {
  return JSON.stringify({ version:1, actor_id:context.editor_actor_id, product_id:context.canonical_product_id, request });
}
export function parsePendingVariant(raw: string, context: VariantEditorContext): VariantDraftInput {
  if (raw.length > 1_000_000) throw new Error('Сохранённый запрос слишком большой.');
  const data = JSON.parse(raw);
  if (data.version !== 1 || data.actor_id !== context.editor_actor_id || data.product_id !== context.canonical_product_id)
    throw new Error('Сохранённый запрос относится к другому пользователю или товару.');
  return parseVariantDraftInput(data.request, context.canonical_product_id);
}
