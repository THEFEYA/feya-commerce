/** Offline, closed-review manifest. It grants no runtime, publishing or sale capability. */
import { createHash } from 'node:crypto';
import { approvedCopyHash, type ApprovedCopyPayload } from './seoApprovedContentProjection.ts';
import { selectLaunchSources, type LaunchSelection } from './searchLaunchSelection.ts';

type Row = Record<string, unknown>;
export type ReleaseCopy = {
  identity: { canonical_product_id: string; seo_page_id: string; draft_id: string; draft_updated_at: string; content_sha256: string };
  payload: ApprovedCopyPayload;
};
export type ReviewRelease = {
  contract_version: 'feya_closed_review_release_v1';
  release_id: string;
  captured_at: string;
  source_commit: string;
  correction_commit: string;
  source_count: number;
  mode: 'closed_review_prepared';
  entries: Array<ReleaseCopy & { product: Row; product_sha256: string }>;
  suppressed: Array<{ canonical_product_id: string; seo_page_id: string; draft_id: string; content_sha256: string; url_path: string }>;
  selection_sha256: string;
  manifest_sha256: string;
  can_publish: false;
  can_index: false;
  can_enable_checkout: false;
};
const productFields = new Set('canonical_product_id product_slug card_title h1 seo_title meta_description product_type material color size_mode production_profile shipping_profile handmade_flag styled_imagery_flag min_price max_price currency price_contract_version price_source_mode price_confidence_status needs_price_review needs_label_review category_label world_label canonical_color_label color_options configurations primary_image_url primary_image_alt secondary_image_url hover_image_url video_url has_video media_count media_gallery'.split(' '));
const configFields = new Set('currency is_bundle sort_order is_full_set public_label component_code component_family configuration_id discount_percent base_price_amount price_source_mode sale_price_amount has_fallback_price needs_label_review display_price_amount has_russian_raw_label bundle_component_codes compare_at_price_amount price_confidence_status sellable_configuration_id'.split(' '));
const mediaFields = new Set('alt url position is_primary media_type'.split(' '));
const isObject = (v: unknown): v is Row => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** Sort object keys; preserve array order, source numbers, nulls and exact approved prose. */
export function canonicalReviewJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalReviewJson).join(',') + ']';
  if (isObject(value) && Object.getPrototypeOf(value) === Object.prototype)
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonicalReviewJson(value[k])).join(',') + '}';
  throw new Error('release_non_json_value');
}
export const reviewHash = (value: unknown) => createHash('sha256').update(canonicalReviewJson(value)).digest('hex');
function fieldsOnly(row: Row, fields: Set<string>) {
  if (Object.keys(row).some(k => !fields.has(k))) throw new Error('release_private_or_unknown_field');
}
function validateProduct(row: Row) {
  fieldsOnly(row, productFields);
  if (typeof row.canonical_product_id !== 'string' || typeof row.product_slug !== 'string') throw new Error('release_product_identity_missing');
  if (!Array.isArray(row.configurations) || !Array.isArray(row.media_gallery)) throw new Error('release_product_snapshot_incomplete');
  for (const config of row.configurations) {
    if (!isObject(config)) throw new Error('release_configuration_shape');
    fieldsOnly(config, configFields);
  }
  for (const media of row.media_gallery) {
    if (!isObject(media)) throw new Error('release_media_shape');
    fieldsOnly(media, mediaFields);
  }
  if (row.color_options !== null && row.color_options !== undefined
    && (!Array.isArray(row.color_options) || row.color_options.some(v => typeof v !== 'string')))
    throw new Error('release_color_shape');
  // Review preserves availability/price uncertainty. It never upgrades it to approval.
  canonicalReviewJson(row);
}
function validateCopy(copy: ReleaseCopy) {
  fieldsOnly(copy as unknown as Row, new Set(['identity','payload']));
  fieldsOnly(copy.identity, new Set(['canonical_product_id','seo_page_id','draft_id','draft_updated_at','content_sha256']));
  fieldsOnly(copy.payload as unknown as Row, new Set(['metadata','draft']));
  fieldsOnly(copy.payload.metadata, new Set(['title','description','canonical_path']));
  fieldsOnly(copy.payload.draft, new Set(['h1','intro','meta_description','pdp_blocks']));
  if (!/^\/shop\/[a-z0-9][a-z0-9-]*$/.test(copy.payload.metadata.canonical_path)) throw new Error('release_path_invalid');
  for (const block of copy.payload.draft.pdp_blocks)
    fieldsOnly(block, new Set(['block_key','placement','heading','body']));
}
function hashableRelease(manifest: ReviewRelease) {
  const { manifest_sha256: _hash, ...value } = manifest;
  return value;
}
export function prepareReviewRelease(input: {
  release_id: string; captured_at: string; source_commit: string; correction_commit: string;
  expected_source_count: number; copies: ReleaseCopy[]; products: Row[]; decisions: LaunchSelection[];
}): ReviewRelease {
  if (!/^[a-z0-9_-]+$/.test(input.release_id) || !Number.isFinite(Date.parse(input.captured_at))
    || !/^[a-f0-9]{40}$/.test(input.source_commit) || !/^[a-f0-9]{40}$/.test(input.correction_commit)
    || !Number.isSafeInteger(input.expected_source_count) || input.expected_source_count < 1)
    throw new Error('release_source_identity_invalid');
  if (input.copies.length !== input.expected_source_count || input.products.length !== input.expected_source_count)
    throw new Error('release_incomplete_source_set');
  const products = new Map<string, Row>();
  for (const product of input.products) {
    validateProduct(product);
    const id = product.canonical_product_id as string;
    if (products.has(id)) throw new Error('release_duplicate_product');
    products.set(id, product);
  }
  for (const copy of input.copies) {
    validateCopy(copy);
    const product = products.get(copy.identity.canonical_product_id);
    if (!product || copy.payload.metadata.canonical_path !== `/shop/${product.product_slug}`
      || !copy.identity.draft_updated_at || !Number.isFinite(Date.parse(copy.identity.draft_updated_at))
      || approvedCopyHash(copy.payload) !== copy.identity.content_sha256)
      throw new Error('release_copy_product_binding_invalid');
  }
  const selection = selectLaunchSources(input.copies, input.decisions);
  const manifest: ReviewRelease = {
    contract_version: 'feya_closed_review_release_v1', release_id: input.release_id,
    captured_at: input.captured_at, source_commit: input.source_commit, correction_commit: input.correction_commit,
    source_count: input.expected_source_count, mode: 'closed_review_prepared',
    entries: selection.visible.map(copy => ({ ...structuredClone(copy),
      product: structuredClone(products.get(copy.identity.canonical_product_id)!),
      product_sha256: reviewHash(products.get(copy.identity.canonical_product_id)!),
    })).sort((a,b) => a.identity.canonical_product_id.localeCompare(b.identity.canonical_product_id)),
    suppressed: selection.suppressed.map(copy => ({ ...copy.identity, url_path: copy.payload.metadata.canonical_path })),
    selection_sha256: reviewHash(input.decisions), manifest_sha256: '',
    can_publish: false, can_index: false, can_enable_checkout: false,
  };
  manifest.manifest_sha256 = reviewHash(hashableRelease(manifest));
  return manifest;
}

/** Integrity only, NOT authorization. The trusted hash must come from a pinned release record. */
export function assertReviewReleaseIntegrity(manifest: ReviewRelease, trustedHash: string) {
  if (!/^[a-f0-9]{64}$/.test(trustedHash) || manifest.manifest_sha256 !== trustedHash
    || reviewHash(hashableRelease(manifest)) !== trustedHash
    || manifest.contract_version !== 'feya_closed_review_release_v1' || manifest.mode !== 'closed_review_prepared'
    || manifest.can_publish !== false || manifest.can_index !== false || manifest.can_enable_checkout !== false)
    throw new Error('release_integrity_failed');
  if (manifest.entries.length + manifest.suppressed.length !== manifest.source_count) throw new Error('release_count_mismatch');
  const ids = new Set<string>(), paths = new Set<string>(), pages = new Set<string>();
  for (const entry of manifest.entries) {
    validateCopy({ identity: entry.identity, payload: entry.payload });
    validateProduct(entry.product);
    if (ids.has(entry.identity.canonical_product_id) || pages.has(entry.identity.seo_page_id)
      || paths.has(entry.payload.metadata.canonical_path)
      || entry.product.canonical_product_id !== entry.identity.canonical_product_id
      || entry.payload.metadata.canonical_path !== `/shop/${entry.product.product_slug}`
      || reviewHash(entry.product) !== entry.product_sha256
      || approvedCopyHash(entry.payload) !== entry.identity.content_sha256) throw new Error('release_entry_mismatch');
    ids.add(entry.identity.canonical_product_id); pages.add(entry.identity.seo_page_id); paths.add(entry.payload.metadata.canonical_path);
  }
  for (const entry of manifest.suppressed) {
    if (ids.has(entry.canonical_product_id) || pages.has(entry.seo_page_id) || paths.has(entry.url_path)) throw new Error('release_suppression_conflict');
    ids.add(entry.canonical_product_id); pages.add(entry.seo_page_id); paths.add(entry.url_path);
  }
  return { source_count: manifest.source_count, visible_count: manifest.entries.length,
    suppressed_count: manifest.suppressed.length, can_publish: false, can_index: false, can_enable_checkout: false } as const;
}
