import { validateVariantSnapshot, type VariantSnapshot } from './commerceVariantContract.ts';

type Shape = { type?: string; nullable?: boolean; enum?: unknown[]; pattern?: string; minLength?: number;
  maxLength?: number; minimum?: number; maximum?: number; maxItems?: number; minItems?: number;
  properties?: Record<string, Shape>; items?: Shape; oneOf?: Shape[] };
const object = (properties: Record<string, Shape>): Shape => ({ type: 'object', properties });
const array = (items: Shape, maxItems: number): Shape => ({ type: 'array', items, maxItems });
const text = (maxLength: number, nullable = false): Shape => ({ type: 'string', minLength: 1, maxLength, nullable });
const id: Shape = { ...text(36), pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' };
const integer = (minimum: number): Shape => ({ type: 'integer', minimum, maximum: Number.MAX_SAFE_INTEGER });
const choices = (...values: string[]): Shape => ({ type: 'string', enum: values });
const attr = object({ id, label: text(140), state: choices('proposed', 'confirmed', 'retired') });
const price = object({ quote_id: id, price_revision: integer(1), status: choices('unverified', 'range'),
  amount_minor: { ...integer(1), nullable: true }, currency: { ...text(3), pattern: '^[A-Z]{3}$' }, evidence_ref: text(500, true) });
const configuration = object({ configuration_price_id: id, sellable_configuration_id: id, base_price: price });
const variant = object({ variant_id: id, configuration_price_id: id, color_id: { ...id, nullable: true },
  size_id: { ...id, nullable: true }, state: choices('draft', 'retired'), pricing: { oneOf: [
    object({ mode: choices('configuration_base') }),
    object({ mode: choices('exception_override'), exception_id: id, reason: text(500), price }),
  ] } });

/** Restricted JSON shape language, mirrored by the SQL validator. Every object key is required; no extra keys. */
export const VARIANT_DRAFT_SCHEMA: Shape = object({
  contract_version: choices('product_variant_draft_v1'), request_id: id, expected_revision: integer(0),
  source_bindings: object({ product_fingerprint: { ...text(32), pattern: '^[0-9a-f]{32}$' },
    configurations: array(object({ configuration_price_id: id, sellable_configuration_id: id,
      price_fingerprint: { ...text(32), pattern: '^[0-9a-f]{32}$' },
      configuration_fingerprint: { ...text(32), pattern: '^[0-9a-f]{32}$' } }), 128) }),
  snapshot: object({ canonical_product_id: id, product_revision: integer(1),
    pricing_policy_ref: choices('owner-configuration-base-price-20260924-04'),
    configurations: { ...array(configuration, 128), minItems: 1 },
    colors: array(attr, 64), sizes: array(attr, 64), variants: array(variant, 512) }),
});

export type VariantDraftInput = {
  contract_version: 'product_variant_draft_v1'; request_id: string; expected_revision: number;
  source_bindings: { product_fingerprint: string; configurations: Array<{
    configuration_price_id: string; sellable_configuration_id: string;
    price_fingerprint: string; configuration_fingerprint: string;
  }> }; snapshot: VariantSnapshot;
};

export function matchesVariantShape(value: unknown, shape: Shape): boolean {
  if (value === null) return shape.nullable === true;
  if (shape.oneOf) return shape.oneOf.filter(s => matchesVariantShape(value, s)).length === 1;
  if (shape.enum && !shape.enum.includes(value)) return false;
  if (shape.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>, props = shape.properties!;
    return Object.keys(record).length === Object.keys(props).length
      && Object.entries(props).every(([key, sub]) => Object.hasOwn(record, key) && matchesVariantShape(record[key], sub));
  }
  if (shape.type === 'array') return Array.isArray(value) && value.length <= shape.maxItems!
    && value.length >= (shape.minItems ?? 0) && value.every(v => matchesVariantShape(v, shape.items!));
  if (shape.type === 'integer') return typeof value === 'number' && Number.isSafeInteger(value)
    && value >= shape.minimum! && value <= shape.maximum!;
  if (shape.type === 'string') return typeof value === 'string'
    && (shape.minLength === undefined || value.trim().length >= shape.minLength)
    && (shape.maxLength === undefined || value.length <= shape.maxLength)
    && (!shape.pattern || new RegExp(shape.pattern).test(value));
  return false;
}

export function parseVariantDraftInput(input: unknown, productId: string): VariantDraftInput {
  if (!matchesVariantShape(input, VARIANT_DRAFT_SCHEMA)) throw new Error('variant_draft_shape_invalid');
  const value = input as VariantDraftInput;
  if (value.snapshot.canonical_product_id !== productId || value.snapshot.product_revision !== value.expected_revision + 1)
    throw new Error('variant_draft_scope_invalid');
  validateVariantSnapshot(value.snapshot);
  return value;
}
