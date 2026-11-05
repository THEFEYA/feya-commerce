// Builds the Google Merchant Center US free-listings pilot feed (TSV) from the
// live storefront readback captured on 2026-11-03. Pure, deterministic, offline.
//
//   node scripts/merchant/build-us-pilot-feed.mjs           -> writes feed
//   node scripts/merchant/build-us-pilot-feed.mjs --check   -> verifies committed feed
//
// Truth rules (docs/merchant/FREE_LISTINGS_PILOT_RUNBOOK_20261103.md):
// - one Full Set offer per product, the configuration the live PDP preselects,
//   at the exact EUR price the PDP shows and checkout charges;
// - only the photographed default color; standard sizes XS–XXXL (same price);
//   "Custom" measurements excluded;
// - approved H1 / meta description verbatim; no material claims (source material
//   strings conflict with Product Truth), no GTIN/MPN invented;
// - shipping comes from the account policy "TheFEYA US Standard" (EUR 19,
//   handling 3–5 + transit 10–14 business days), so no per-item shipping.
import {readFileSync, writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const dir = new URL('../../docs/merchant/pilot-us-20261103/', import.meta.url);
const SOURCE = new URL('source_live_readback.tsv', dir);
// The historical URL is now the active full-catalogue transport. Keep this
// builder reproducible against the immutable 84-offer rollback snapshot.
const FEED = new URL('thefeya_us_free_listings_pilot_20261103_frozen.tsv', dir);

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
// Gender of the wearer stated by the approved H1 / meta description.
const GENDER = {
  '4340584466': 'female', '4507727106': 'female', '4306378825': 'female',
  '4369438053': 'female', '4456102467': 'female', '1890268726': 'female',
  '4352690758': 'male', '4326178885': 'male', '4489659396': 'male',
  '4352810754': 'male', '1890733162': 'male', '4364292059': 'male',
};
const UTM = 'utm_source=google&utm_medium=organic_shopping&utm_campaign=mc_us_free_listings_pilot';
const COLUMNS = [
  'id', 'item_group_id', 'title', 'description', 'link', 'image_link', 'additional_image_link',
  'availability', 'price', 'condition', 'brand', 'identifier_exists', 'google_product_category',
  'product_type', 'color', 'size', 'size_system', 'gender', 'age_group', 'custom_label_0',
];

function imageUrl(token) {
  const m = token.match(/^([0-9a-f]+)\/(\d+)\/([a-z0-9]+)$/);
  assert.ok(m, `bad image token ${token}`);
  return `https://i.etsystatic.com/54033853/r/il/${m[1]}/${m[2]}/il_fullxfull.${m[2]}_${m[3]}.jpg`;
}

function tsvCell(value) {
  const s = String(value);
  assert.ok(!/[\t\r\n]/.test(s), `tab/newline in cell: ${s.slice(0, 40)}`);
  return s;
}

export function buildRows(sourceText) {
  const [header, ...lines] = sourceText.trim().split('\n');
  const cols = header.split('\t');
  const rows = [];
  for (const line of lines) {
    const rec = Object.fromEntries(line.split('\t').map((v, i) => [cols[i], v]));
    const gender = GENDER[rec.etsy_tail];
    assert.ok(gender, `no gender for ${rec.etsy_tail}`);
    const minor = Math.round(Number(rec.price_eur) * 100);
    assert.ok(Number.isSafeInteger(minor) && minor > 0, `bad price ${rec.price_eur}`);
    const price = `${(minor / 100).toFixed(2)} EUR`;
    const images = rec.images.split(',').map(imageUrl);
    assert.ok(rec.approved_h1.length > 0 && rec.approved_h1.length <= 150);
    assert.ok(rec.approved_meta_description.length > 0 && rec.approved_meta_description.length <= 5000);
    assert.match(rec.full_set_configuration_id, /^[0-9a-f-]{36}$/);
    for (const size of SIZES) {
      rows.push({
        id: `${rec.full_set_configuration_id}-${size}`,
        item_group_id: rec.full_set_configuration_id,
        title: rec.approved_h1,
        description: rec.approved_meta_description,
        link: `https://thefeya.com/shop/${rec.slug}?${UTM}`,
        image_link: images[0],
        additional_image_link: images.slice(1, 6).join(','),
        availability: 'in_stock',
        price,
        condition: 'new',
        brand: 'TheFEYA',
        identifier_exists: 'no',
        google_product_category: 'Apparel & Accessories > Costumes & Accessories > Costumes',
        product_type: 'Costumes > Full Set',
        color: rec.default_color,
        size,
        size_system: 'US',
        gender,
        age_group: 'adult',
        custom_label_0: 'us_pilot_20261103',
      });
    }
  }
  const ids = new Set(rows.map(r => r.id));
  assert.equal(ids.size, rows.length, 'duplicate offer ids');
  return rows;
}

export function toTsv(rows) {
  return [COLUMNS.join('\t'), ...rows.map(r => COLUMNS.map(c => tsvCell(r[c])).join('\t'))].join('\n') + '\n';
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const output = toTsv(buildRows(readFileSync(SOURCE, 'utf8')));
  if (process.argv.includes('--check')) assert.equal(readFileSync(FEED, 'utf8'), output, 'pilot feed must be regenerated');
  else writeFileSync(FEED, output);
  console.log(JSON.stringify({rows: output.trim().split('\n').length - 1, bytes: Buffer.byteLength(output)}));
}
