import type { StorefrontProduct } from './types';

/**
 * Lossless transport-only reduction for the 207-item public Shop catalog.
 *
 * Keeps every source field/value and all 207 items. Only repeated JSON object
 * field names are transmitted once. Never changes prices, search facets,
 * imagery, ordering, eligibility, text or the Product OS rendering component.
 * A heterogeneous payload automatically falls back to the original format.
 */
export type StorefrontCatalogWire =
  | { format: 'columns-v1'; fields: string[]; values: unknown[][] }
  | { format: 'raw-v1'; products: StorefrontProduct[] };

export function packStorefrontCatalog(products: StorefrontProduct[]): StorefrontCatalogWire {
  if (products.length === 0) return { format: 'columns-v1', fields: [], values: [] };
  if (products.some((row) => row == null || typeof row !== 'object' || Array.isArray(row))) {
    return { format: 'raw-v1', products };
  }

  const fields = Object.keys(products[0]).sort();
  // A format change or a field appearing only on one product must not drop
  // content silently: lossless fallback over a speculative partial codec.
  if (fields.length === 0) return { format: 'raw-v1', products };
  const signature = fields.join('\u0000');
  const values: unknown[][] = [];
  for (const product of products) {
    const object = product as unknown as Record<string, unknown>;
    if (Object.keys(object).sort().join('\u0000') !== signature) {
      return { format: 'raw-v1', products };
    }
    const row = fields.map((field) => object[field]);
    if (row.some((value) => value === undefined)) {
      return { format: 'raw-v1', products };
    }
    values.push(row);
  }
  return { format: 'columns-v1', fields, values };
}

export function unpackStorefrontCatalog(wire: StorefrontCatalogWire): StorefrontProduct[] {
  if (wire.format === 'raw-v1') return wire.products;
  if (new Set(wire.fields).size !== wire.fields.length
    || wire.values.some((row) => !Array.isArray(row) || row.length !== wire.fields.length)) {
    throw new Error('FEYA_SHOP_CATALOG_WIRE_INVALID');
  }
  return wire.values.map((row) => {
    const decoded = Object.fromEntries(wire.fields.map((field, index) => [field, row[index]]));
    return decoded as StorefrontProduct;
  });
}
