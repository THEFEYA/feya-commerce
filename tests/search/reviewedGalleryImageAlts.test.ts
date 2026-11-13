import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {ALL_REVIEWED_PRIMARY_IMAGE_ALTS} from '../../lib/storefrontReviewedPrimaryImageAlts.ts';
import {REVIEWED_GALLERY_IMAGE_ALT_CATALOG_20261113 as CATALOG} from '../../lib/storefrontReviewedGalleryImageAltCatalog.ts';
import {applyReviewedGalleryImageAlts, reviewedGalleryPhotoUrls} from '../../lib/storefrontReviewedGalleryImageAlts.ts';
import {sitemapProductImages} from '../../lib/sitemapProductImages.ts';

const BANNED = /\b(metal|metallic|chrome|steel|cyber|cyberpunk|fetish|bdsm|sexy|best|erotic)\b/i;
// Only these listings genuinely carry feather trim; elsewhere the photo shows fluffy trim.
const FEATHER_LISTINGS = ['-1810732577', '-4332119985', '-1881683502'];
const PRIMARY = new Map(ALL_REVIEWED_PRIMARY_IMAGE_ALTS.map(item => [item.canonicalProductId, item]));

test('every non-primary gallery photo of the 205 products with a gallery has one reviewed ALT', () => {
  const pairs = CATALOG.flatMap(row => row.canonicalProductIds.map(id => `${id}\n${row.imageUrl}`));
  assert.equal(CATALOG.length, 1207);
  assert.equal(new Set(CATALOG.map(row => row.imageUrl)).size, 1198);
  assert.equal(pairs.length, 1559);
  assert.equal(new Set(pairs).size, 1559, 'one caption per product photo');
  assert.equal(new Set(CATALOG.flatMap(row => row.canonicalProductIds)).size, 205);
});

test('gallery captions are natural, unique photo descriptions without material or keyword claims', () => {
  const urlsByAlt = new Map<string, Set<string>>();
  const primaryAlts = new Map(ALL_REVIEWED_PRIMARY_IMAGE_ALTS.map(item => [item.altText, item.imageUrl]));
  for (const row of CATALOG) {
    assert.match(row.imageUrl, /^https:\/\/i\.etsystatic\.com\/54033853\/r\/il\/[0-9a-f]+\/\d+\/il_fullxfull\.\d+_[a-z0-9]+\.jpg$/);
    assert.ok(row.altText.length >= 40 && row.altText.length <= 125, row.altText);
    assert.equal(BANNED.test(row.altText), false, row.altText);
    assert.equal(/\s{2,}|\.$|base layer/.test(row.altText), false, row.altText);
    assert.ok(row.canonicalProductIds.length >= 1);
    for (const id of row.canonicalProductIds) {
      const primary = PRIMARY.get(id);
      assert.ok(primary, id);
      assert.notEqual(row.imageUrl, primary.imageUrl, 'primary photo stays owned by the primary binding');
      if (/feather/i.test(row.altText)) {
        assert.ok(FEATHER_LISTINGS.some(suffix => primary.productSlug.endsWith(suffix)), row.altText);
      }
    }
    if (!urlsByAlt.has(row.altText)) urlsByAlt.set(row.altText, new Set());
    urlsByAlt.get(row.altText)!.add(row.imageUrl);
    const primaryUrl = primaryAlts.get(row.altText);
    assert.ok(!primaryUrl || primaryUrl === row.imageUrl, `caption reused for a different photo: ${row.altText}`);
  }
  for (const [alt, urls] of urlsByAlt) assert.equal(urls.size, 1, `one caption, one photograph: ${alt}`);
});

const sample = () => {
  const row = CATALOG.find(item => item.canonicalProductIds.length === 1)!;
  const primary = PRIMARY.get(row.canonicalProductIds[0])!;
  return {row, primary, product: {
    canonical_product_id: primary.canonicalProductId,
    product_slug: primary.productSlug,
    primary_image_url: primary.imageUrl,
    primary_image_alt: primary.altText,
    media_gallery: [
      {url: primary.imageUrl, alt: primary.altText, media_type: 'image', position: 1},
      {url: row.imageUrl, alt: 'Legacy listing title', media_type: 'image', position: 2},
      {url: row.imageUrl.replace('.jpg', '.mp4'), alt: 'Video', media_type: 'video', position: 3},
      {url: 'https://i.etsystatic.com/54033853/r/il/000000/1/il_fullxfull.1_unknown.jpg', alt: 'Unreviewed', media_type: 'image', position: 4},
    ],
  }};
};

test('gallery binding applies only to the exact product, slug and photograph and never mutates input', () => {
  const {row, primary, product} = sample();
  const before = JSON.stringify(product);
  const patched = applyReviewedGalleryImageAlts(product);
  assert.equal(JSON.stringify(product), before);
  assert.deepEqual(patched.media_gallery.map(item => item.alt), [primary.altText, row.altText, 'Video', 'Unreviewed']);
  assert.deepEqual(patched.media_gallery.map(item => item.url), product.media_gallery.map(item => item.url));
  assert.equal(patched.primary_image_alt, primary.altText);
  assert.deepEqual(applyReviewedGalleryImageAlts(patched), patched, 'idempotent');

  for (const changed of [
    {product_slug: `${primary.productSlug}-copy`},
    {product_slug: null},
    {canonical_product_id: '00000000-0000-0000-0000-000000000000'},
    {media_gallery: null},
  ]) {
    const foreign = {...product, ...changed};
    assert.equal(applyReviewedGalleryImageAlts(foreign), foreign, JSON.stringify(changed));
  }
  // A caption cannot travel to another product that shows a different gallery.
  const other = [...PRIMARY.values()].find(item => !row.canonicalProductIds.includes(item.canonicalProductId))!;
  const transplanted = {...product, canonical_product_id: other.canonicalProductId, product_slug: other.productSlug, primary_image_url: other.imageUrl};
  assert.equal(applyReviewedGalleryImageAlts(transplanted), transplanted);
});

test('sitemap keeps the primary photo first and adds only the product\'s reviewed gallery photos', () => {
  const {row, primary} = sample();
  const product = {canonical_product_id: primary.canonicalProductId, product_slug: primary.productSlug, primary_image_url: primary.imageUrl};
  const path = `/shop/${primary.productSlug}`;
  const photos = reviewedGalleryPhotoUrls(primary.canonicalProductId, primary.productSlug);
  assert.ok(photos.includes(row.imageUrl));
  assert.deepEqual(reviewedGalleryPhotoUrls(primary.canonicalProductId, `${primary.productSlug}-copy`), []);
  const enriched = sitemapProductImages([product], p => [...reviewedGalleryPhotoUrls(p.canonical_product_id, p.product_slug), primary.imageUrl, 'https://private.example/a.jpg']).get(path)!;
  assert.equal(enriched[0], primary.imageUrl);
  assert.deepEqual(enriched.slice(1), [...photos]);
  assert.deepEqual(sitemapProductImages([product]).get(path), [primary.imageUrl]);
  assert.equal(sitemapProductImages([{...product, primary_image_url: null}], () => photos).size, 0,
    'gallery photos never stand in for a missing primary photo');
});

test('PDP reader and gallery thumbnails carry the reviewed ALT; sitemap uses the static catalog', () => {
  const reader = readFileSync('lib/storefrontProductDetailReadModelServer.ts', 'utf8');
  assert.ok(reader.includes('applyReviewedGalleryImageAlts(applyReviewedPrimaryImageAlt(product, row.source_draft_id))'));
  const pdp = readFileSync('components/ProductDetailClient.tsx', 'utf8');
  assert.ok(pdp.includes('<Image src={String(g.url)} alt={g.alt || \'\'} fill sizes="132px" loading="lazy"'));
  assert.ok(pdp.includes('aria-label={`Show image ${i + 1} of ${gallery.length}`}'));
  const sitemap = readFileSync('app/sitemap.ts', 'utf8');
  assert.ok(sitemap.includes('reviewedGalleryPhotoUrls(product.canonical_product_id,product.product_slug)'));
});
