import {createHash} from 'node:crypto';
import {colorChoiceLabel} from '../bonanzaColorChoices.ts';
import {CHECKOUT_POLICY_BUNDLE_V1} from './checkoutPolicyEvidence.ts';
import type {CheckoutAddress, CheckoutBuyer, CheckoutRequestV1} from './checkoutRequest.ts';
import {CHECKOUT_PRICING_V1, type CheckoutAmounts, type DeliveryMethod, type ExtraLine, type PricedLine} from './pricing.ts';

export const SELLER_ONLINE_CHECKOUT_DISCLOSURE =
  'Payments are securely processed by Seller-Online LLC, our authorized payment recipient and logistics partner.';

export const DELIVERY_LABELS: Record<DeliveryMethod, {label: string; window: string}> = {
  standard: {label: 'Standard Shipping', window: '10–14 business days'},
  express: {label: 'Express Shipping', window: '6–9 business days, priority order preparation'},
};

export type OrderSnapshotLine = Omit<PricedLine, never>;

/** Immutable description of exactly what the buyer agreed to pay for. */
export type OrderSnapshotV1 = {
  contract: 'feya_order_snapshot_v1';
  kind: 'customer' | 'test';
  pricing_contract: string;
  currency: 'EUR';
  lines: OrderSnapshotLine[];
  extras: ExtraLine[];
  amounts: CheckoutAmounts;
  delivery: {method: DeliveryMethod; label: string; window: string; remote_destination: boolean} | null;
  buyer: CheckoutBuyer | null;
  address: CheckoutAddress | null;
  gift_message: string | null;
  note: string | null;
  marketing_opt_in: boolean;
  accepted_terms: boolean;
  policies: {
    terms:string;shipping:string;returns:string;privacy:string;
    accepted_bundle_version?:string;
    accepted_at?:string;
    source_blob_sha1?:Record<string,string>;
  };
  disclosure: string;
  created_at: string;
};

export function buildCustomerSnapshot(input: {
  request: CheckoutRequestV1;
  lines: PricedLine[];
  extras: ExtraLine[];
  amounts: CheckoutAmounts;
  now?: Date;
}): OrderSnapshotV1 {
  const {request, lines, extras, amounts} = input;
  const acceptedAt=(input.now||new Date()).toISOString();
  return {
    contract: 'feya_order_snapshot_v1',
    kind: 'customer',
    pricing_contract: CHECKOUT_PRICING_V1.contract,
    currency: 'EUR',
    // The existing buyer-receipt RPC exposes only the top-level color/size
    // fields, not the nested pair object. Preserve the exact independently
    // verified pair object AND show both people in receipts/owner order views
    // without replacing or migrating the payments database.
    lines: lines.map(line => {
      const pair=line.paired_selection;
      return stripUndefined({
        ...line,
        ...(pair ? {
          size:`Women ${pair.women.size} / Men ${pair.men.size}`,
          color:`Women ${colorChoiceLabel(pair.women.color)} / Men ${colorChoiceLabel(pair.men.color)}`,
        } : {}),
        price_changed: undefined,
      } as PricedLine);
    }),
    extras,
    amounts,
    delivery: {method: request.method, ...DELIVERY_LABELS[request.method], remote_destination: amounts.remote_minor > 0},
    buyer: request.buyer,
    address: request.address,
    gift_message: request.gift_message,
    note: request.note,
    marketing_opt_in: request.marketing_opt_in,
    accepted_terms: true,
    policies: {
      terms: '/terms', shipping: '/shipping', returns: '/returns', privacy: '/privacy',
      accepted_bundle_version:CHECKOUT_POLICY_BUNDLE_V1.version,
      accepted_at:acceptedAt,
      source_blob_sha1:Object.fromEntries(Object.entries(CHECKOUT_POLICY_BUNDLE_V1.sources).map(
        ([key,identity])=>[key,identity.git_blob_sha1],
      )),
    },
    disclosure: SELLER_ONLINE_CHECKOUT_DISCLOSURE,
    created_at:acceptedAt,
  };
}

export const TEST_PAYMENT_MINOR = 100;

export function buildTestSnapshot(now = new Date()): OrderSnapshotV1 {
  const line: PricedLine = {
    line_id: 'connection-test', canonical_product_id: '00000000-0000-4000-8000-000000000000',
    slug: 'connection-test', title: 'Seller Online connection test', option_label: 'Payment test',
    configuration_id: 'connection-test', color: '-', size: '-', wearer: null, made_to_measure: false,
    quantity: 1, unit_minor: TEST_PAYMENT_MINOR, line_minor: TEST_PAYMENT_MINOR, image: null,
  };
  return {
    contract: 'feya_order_snapshot_v1', kind: 'test', pricing_contract: 'feya_connection_test_v1', currency: 'EUR',
    lines: [line], extras: [],
    amounts: {currency: 'EUR', merchandise_minor: TEST_PAYMENT_MINOR, extras_minor: 0, shipping_minor: 0,
      remote_minor: 0, handling_minor: 0, tax_minor: 0, total_minor: TEST_PAYMENT_MINOR,
      distinct_listing_count: 1, item_quantity: 1},
    delivery: null, buyer: null, address: null, gift_message: null, note: null,
    marketing_opt_in: false, accepted_terms: false,
    policies: {terms: '/terms', shipping: '/shipping', returns: '/returns', privacy: '/privacy'},
    disclosure: SELLER_ONLINE_CHECKOUT_DISCLOSURE, created_at: now.toISOString(),
  };
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

/** Canonical JSON (sorted keys) for hashing. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return '{' + entries.map(([k, v]) => JSON.stringify(k) + ':' + canonicalJson(v)).join(',') + '}';
}

export function sha256Hex(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** What the request "means" for idempotency: same cart + same buyer ⇒ same order. */
export function checkoutRequestFingerprint(request: CheckoutRequestV1) {
  const {idempotency_key: _ignored, ...meaning} = request;
  return sha256Hex(canonicalJson(meaning));
}
