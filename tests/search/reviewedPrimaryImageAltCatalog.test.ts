import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {
  ALL_REVIEWED_PRIMARY_IMAGE_ALTS,
  REVIEWED_PRIMARY_IMAGE_ALTS,
  applyReviewedPrimaryImageAlt,
} from '../../lib/storefrontReviewedPrimaryImageAlts.ts';
import {REVIEWED_PRIMARY_IMAGE_ALT_CATALOG_20261113} from '../../lib/storefrontReviewedPrimaryImageAltCatalog.ts';

const BANNED = /\b(metal|metallic|chrome|steel|cyber|cyberpunk|fetish|bdsm|sexy|best|erotic)\b/i;

test('one reviewed primary ALT per published product, bound to a unique product, slug and photo', () => {
  assert.equal(REVIEWED_PRIMARY_IMAGE_ALTS.length, 5);
  assert.equal(REVIEWED_PRIMARY_IMAGE_ALT_CATALOG_20261113.length, 202);
  assert.equal(ALL_REVIEWED_PRIMARY_IMAGE_ALTS.length, 207);
  for (const key of ['canonicalProductId', 'productSlug', 'imageUrl', 'altText'] as const) {
    assert.equal(new Set(ALL_REVIEWED_PRIMARY_IMAGE_ALTS.map(item => item[key].toLowerCase())).size, 207, key);
  }
});

test('catalog captions are natural photo descriptions without material or keyword claims', () => {
  for (const item of REVIEWED_PRIMARY_IMAGE_ALT_CATALOG_20261113) {
    assert.match(item.canonicalProductId, /^[0-9a-f-]{36}$/);
    assert.match(item.sourceDraftId, /^[0-9a-f-]{36}$/);
    assert.match(item.imageUrl, /^https:\/\/i\.etsystatic\.com\/54033853\/r\/il\/[0-9a-f]+\/\d+\/il_fullxfull\.\d+_[a-z0-9]+\.jpg$/);
    assert.match(item.productSlug, /-\d{6,}$/);
    assert.ok(item.altText.length >= 40 && item.altText.length <= 125, item.altText);
    assert.equal(BANNED.test(item.altText), false, item.altText);
    assert.equal(/\s{2,}|\.$/.test(item.altText), false, item.altText);
  }
  const noFeatherClaim = REVIEWED_PRIMARY_IMAGE_ALT_CATALOG_20261113.find(item => item.productSlug.endsWith('-4461233290'));
  assert.ok(noFeatherClaim && !/feather/i.test(noFeatherClaim.altText));
});

test('catalog binding applies only to the exact product, draft and photograph', () => {
  const pin = REVIEWED_PRIMARY_IMAGE_ALT_CATALOG_20261113[0];
  const product = {
    canonical_product_id: pin.canonicalProductId, product_slug: pin.productSlug,
    primary_image_url: pin.imageUrl, primary_image_alt: 'Legacy listing title',
    media_gallery: [{url: pin.imageUrl, media_type: 'image', alt: 'Legacy listing title', position: 1}],
  };
  const result = applyReviewedPrimaryImageAlt(product, pin.sourceDraftId);
  assert.equal(result.primary_image_alt, pin.altText);
  assert.equal((result.media_gallery as Array<{alt: string}>)[0].alt, pin.altText);
  assert.equal(applyReviewedPrimaryImageAlt({...product, primary_image_url: 'https://i.etsystatic.com/x.jpg'}, pin.sourceDraftId).primary_image_alt, 'Legacy listing title');
  assert.equal(applyReviewedPrimaryImageAlt(product, 'another-draft').primary_image_alt, 'Legacy listing title');
});

test('catalog cards render the reviewed primary ALT and the hover duplicate stays decorative', () => {
  const card = readFileSync(new URL('../../components/ProductCard.tsx', import.meta.url), 'utf8');
  assert.ok(card.includes('alt={p.primary_image_alt || title}'));
  assert.ok(card.includes('alt="" fill sizes={cardSizes} loading="lazy" onLoad={() => setHoverReady(true)}'));
});

test('site favicon set exists as stable app-router file conventions', () => {
  for (const file of ['../../app/favicon.ico', '../../app/icon.png', '../../app/apple-icon.png']) {
    assert.ok(readFileSync(new URL(file, import.meta.url)).length > 1000, file);
  }
  const png = readFileSync(new URL('../../app/icon.png', import.meta.url));
  assert.equal(png.readUInt32BE(16), 512);
  assert.equal(png.readUInt32BE(20), 512);
  // Next/Turbopack decodes ICO frames and rejects PNG frames that are not RGBA.
  const ico = readFileSync(new URL('../../app/favicon.ico', import.meta.url));
  const frames = ico.readUInt16LE(4);
  assert.ok(frames >= 3);
  for (let i = 0; i < frames; i++) {
    const size = ico.readUInt32LE(6 + 16 * i + 8);
    const offset = ico.readUInt32LE(6 + 16 * i + 12);
    const frame = ico.subarray(offset, offset + size);
    assert.equal(frame.subarray(1, 4).toString('latin1'), 'PNG');
    assert.equal(frame[25], 6, `ICO frame ${i} must be RGBA PNG`);
  }
});
