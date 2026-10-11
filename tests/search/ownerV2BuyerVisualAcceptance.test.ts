import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');

test('Contact puts direct contact and question form alongside, then maps and newsletter, then subdued operator',()=>{
  const src=read('components/ContactExperience2026.tsx');
  assert.match(src,/grid-cols-\[minmax\(0,.85fr\)_minmax\(0,1.15fr\)\]/);
  assert.match(src,/OwnerContactFormPreview/);
  assert.match(src,/CopySupportEmailButton email=\{contactEmail\}/);
  assert.match(src,/CopySupportEmailButton email=\{supportPhone\} label="phone number"/);
  assert.match(src,/href="https:\/\/wa.me\/380636556288"/);
  assert.match(src,/OwnerNewsletterSignupPreview/);
  assert.ok(src.indexOf('<OwnerContactFormPreview/>')<src.indexOf('OwnerLocationMapPreview location="kyiv"'));
  assert.ok(src.indexOf('OwnerLocationMapPreview location="us-warehouse"')<src.lastIndexOf('<OwnerNewsletterSignupPreview/>'));
  assert.ok(src.indexOf('<OwnerNewsletterSignupPreview/>')<src.indexOf('payment-operator-heading'));
  assert.match(src,/op\.contactAddress\.postalCode/);
  assert.match(src,/Online payments on thefeya.com are not active yet/);
});

test('Newsletter is honest: independent opt-in, no pretend subscription or data transmission',()=>{
  const src=read('components/OwnerNewsletterSignupPreview.tsx');
  assert.match(src,/type="email" required/);
  assert.match(src,/type="checkbox" checked=\{consent\}/);
  assert.match(src,/Subscribe/);
  assert.match(src,/Nothing has been stored or sent yet/);
  assert.doesNotMatch(src,/fetch\(|localStorage|subscribeEmail\(|sessionStorage/);
});

test('About combines actual studio story with mission, modern inline 29px icons, no inline studio link',()=>{
  const src=read('components/OwnerEditorialReviewPages.tsx');
  const start=src.indexOf('export function OwnerAboutReview()');
  const end=src.indexOf('const policySections=[',start);
  assert.ok(start>=0&&end>start);
  const about=src.slice(start,end);
  assert.match(about,/About TheFEYA/);
  assert.match(about,/Our mission/);
  assert.match(about,/creative team specializing in handmade/);
  assert.match(about,/Our mission/);
  assert.doesNotMatch(about,/lg:grid-cols-\[minmax\(0,1.08fr\)_minmax\(0,.92fr\)\]/);
  assert.match(about,/<Icon size=\{29\}/);
  assert.doesNotMatch(about,/>Ask our studio<\/Link>/);
});

test('Style and Events hub SEO is responsive continuous SSR text, one arrow disclosure, no boxed keywords',()=>{
  const src=read('components/OwnerHubSeoText.tsx');
  assert.match(src,/<details className="group/);
  assert.match(src,/<summary aria-label=/);
  assert.match(src,/<ChevronDown size=\{23\}/);
  assert.ok(!src.includes('max-w-[1100px]'));
  assert.ok(src.includes('w-full min-w-0'));
  assert.doesNotMatch(src,/rounded-xl border/);
  assert.doesNotMatch(src,/Read more about/);
  for(const path of ['app/style-review/page.tsx','app/events-performance-review/page.tsx']){
    const page=read(path);
    assert.match(page,/owner-hub-products/);
    assert.match(page,/pb-0 pt-2/);
    assert.match(page,/<OwnerHubSeoText kind=/);
    assert.match(page,/index:false,follow:false/);
  }
});

test('owner cart is compact and photos larger without losing multiple-item lists',()=>{
  const source=read('components/CartOwnerLiveReviewClient.tsx');
  assert.match(source,/lg:pt-28/);
  assert.ok(source.includes('sm:h-[172px] sm:w-[136px]'));
  assert.match(source,/aria-labelledby="owner-cart-extras-title"/);
  assert.match(source,/sm:grid-cols-2/);
  assert.ok(source.includes('customFitIds.includes(item.id)'));
  assert.match(source,/Gift message card/);
  assert.match(source,/Gift box/);
});

test('only the protected owner style sheet compacts collection whitespace and expands collection intro',()=>{
  const css=read('app/ownerVisualPreviewV2.css');
  assert.match(css,/column-count: 2/);
  assert.ok(css.includes('nav[aria-label="Breadcrumb"]'));
  assert.ok(css.includes('section:nth-of-type(5)'));
  assert.ok(css.includes('section:nth-of-type(6)'));
});

test('owner visual About and Shipping headings align with compact icons instead of stacked spacers',()=>{
  const about=read('components/OwnerEditorialReviewPages.tsx');
  const shipping=read('app/shipping-review/page.tsx');
  assert.match(about,/flex items-center gap-4/);
  assert.match(about,/h-14 w-14/);
  assert.doesNotMatch(about,/mt-6 text-\[clamp\(20px,2.1vw,25px\)\]/);
  assert.match(shipping,/Handmade for you/);
  assert.match(shipping,/flex items-center gap-4/);
  assert.doesNotMatch(shipping,/eyebrow-gold mt-6">Handmade for you/);
  assert.match(shipping,/6–9 working days/);
});

test('Product OS page and card remain frozen while the scoped PDP error boundary permits bounded retry',()=>{
 const page=read('app/shop/[slug]/page.tsx');
 const card=read('components/ProductCard.tsx');
 const fallback=read('app/shop/[slug]/error.tsx');
 assert.match(page,/readCachedStorefrontProductMetadataV1/);
 assert.match(page,/readCachedStorefrontProductPresentation/);
 assert.match(card,/router.prefetch\(href\)/);
 assert.match(fallback,/window\.sessionStorage\.getItem/);
 assert.match(fallback,/15000/);
 assert.match(fallback,/reset\(\)/);
 assert.match(fallback,/We couldn’t open this item/);
});

test('owner V5 cart legal consents remain independent without repeated privacy filler',()=>{
 const src=read('components/CartOwnerLiveReviewClient.tsx');
 assert.match(src,/I have read the /);
 assert.match(src,/marketingConsent/);
 assert.match(src,/Optional: I would like to receive TheFEYA news/);
 assert.doesNotMatch(src,/Your information is handled in accordance with our/);
});
test('owner V5 About hero uses page canvas while keeping horizontal mission separator',()=>{
 const src=read('components/OwnerEditorialReviewPages.tsx');
 const start=src.indexOf('export function OwnerAboutReview()');
 const end=src.indexOf('const policySections=[',start);
 const about=src.slice(start,end);
 assert.match(about,/<div className="w-full">/);
 assert.match(about,/border-t border-\[rgba\(212,178,106,.26\)\]/);
 assert.doesNotMatch(about,/rounded-\[20px\] border border-\[rgba\(212,178,106,.22\)\]/);
 assert.match(about,/Be seen\. Be remembered\. Be yourself/);
});
test('owner V5 shipping reduces card heights and puts proper titles over restrained prices',()=>{
 const src=read('app/shipping-review/page.tsx');
 for(const name of ['Handmade for you','Standard Shipping','Express Shipping']){
   assert.ok(src.includes('>'+name+'</h2>'),name);
 }
 assert.match(src,/px-5 py-5 sm:px-6 sm:py-5/);
 assert.match(src,/text-\[30px\]/);
 assert.match(src,/text-\[32px\]/);
 assert.match(src,/pt-24 pb-7 sm:pt-28 lg:pt-28/);
 assert.match(src,/6–9 working days/);
});
test('owner V5 Contact reduces top whitespace, Google Maps height, and newsletter vertical stack',()=>{
 const contact=read('components/ContactExperience2026.tsx');
 const map=read('components/OwnerLocationMapPreview.tsx');
 const newsletter=read('components/OwnerNewsletterSignupPreview.tsx');
 assert.match(contact,/pt-20 pb-7 sm:pt-24 lg:pt-24/);
 assert.match(map,/aspect-\[16\/9\]/);
 assert.match(map,/min-h-\[205px\]/);
 assert.match(newsletter,/minmax\(0,.82fr\)_minmax\(0,1.18fr\)/);
 assert.match(newsletter,/<Mail size=\{23\}/);
 assert.match(newsletter,/lg:px-8 lg:py-6/);
 assert.match(newsletter,/type="checkbox" checked=\{consent\}/);
});

test('owner V6 all collection landings compact Show More -> Related -> Before through semantic sibling CSS',()=>{
 const css=read('app/ownerVisualPreviewV2.css');
 assert.ok(css.includes('> section:has(.visual-commerce-embedded) + section'));
 assert.ok(css.includes('> section:has(.visual-commerce-embedded) + section + section'));
 assert.ok(css.includes('.visual-commerce-embedded > section'));
});
test('owner V6 Style tiles render before one catalogue read, no empty suspense wall',()=>{
 const src=read('app/style-review/page.tsx');
 assert.ok(src.indexOf('OwnerDiscoveryTileStrip tiles={STYLE_HUB_TILES}')<src.indexOf('<Suspense fallback={<OwnerHubCatalogSkeleton/>}>'));
 assert.ok(src.includes('const products=await readStyleHubProducts();'));
 assert.ok(!src.includes('readStyleTileAvailability'));
 assert.ok(!src.includes('min-h-[550px]'));
 assert.ok(read('components/OwnerHubCatalogSkeleton.tsx').includes('Loading the pieces'));
 assert.ok(src.includes('robots:{index:false,follow:false'));
});
test('owner V6 improves delivery scannability, About breathing room and low-emphasis Contact footer',()=>{
 const cart=read('components/CartOwnerLiveReviewClient.tsx');
 const about=read('components/OwnerEditorialReviewPages.tsx');
 const shipping=read('app/shipping-review/page.tsx');
 const contact=read('components/ContactExperience2026.tsx');
 assert.ok(!cart.includes('indicative planning estimate'));
 assert.ok(cart.includes('Delivery times are approximate'));
 const intro=about.slice(about.indexOf('export function OwnerAboutReview()'),about.indexOf('const policySections=['));
 assert.ok(intro.includes('pt-20 pb-11'));
 assert.ok(intro.includes('lg:pb-12'));
 for(const value of ['3–5 days','€19','€35'])assert.ok(shipping.includes(value));
 assert.ok(shipping.includes('mt-3 text-[30px]'));
 assert.ok(shipping.includes('mt-3 text-[32px]'));
 assert.ok(shipping.includes('mt-1 text-[14px]'));
 assert.ok(contact.includes('<Icon size={22}'));
 assert.ok(contact.includes('payment-operator-heading'));
 assert.ok(!contact.includes('rounded-xl border border-[rgba(216,214,211,.09)]'));
});

test('owner V7 Shop footer is present ONLY on /shop, not duplicated on PDPs',()=>{
 const template=read('app/template.tsx');
 const footer=read('components/OwnerShopFooterPreview.tsx');
 assert.match(template,/isOwnerUnifiedStorefrontPreview\(process\.env\)/);
 assert.match(template,/<OwnerShopFooterPreview\/>/);
 assert.match(footer,/usePathname\(\)/);
 assert.match(footer,/pathname!=='\/shop'/);
 assert.match(footer,/return <Footer\/>/);
 assert.match(read('components/Footer.tsx'),/<footer/);
});
test('owner V7 FAQ uses SSR native disclosures and compact footer spacing, public collection markup unchanged',()=>{
 const page=read('app/collections/[slug]/page.tsx');
 const faq=read('components/OwnerCollectionFaqAccordion.tsx');
 assert.match(page,/visualFaqPreview=isOwnerUnifiedStorefrontPreview\(process\.env\)/);
 assert.match(page,/OwnerCollectionFaqAccordion faq=\{content\.faq\}/);
 assert.match(page,/container-feya pb-4 lg:pb-6/);
 assert.match(page,/container-feya pb-16 lg:pb-24/);
 assert.match(page,/\{content\.faq\.map\(\(item\)=>\(/);
 assert.match(faq,/<details key=/);
 assert.match(faq,/<summary className=/);
 assert.match(faq,/group-open:rotate-180/);
 assert.match(faq,/\{item\.q\}/);
 assert.match(faq,/\{item\.a\}/);
 assert.doesNotMatch(faq,/useState|onClick|setOpen/);
});

test('owner V7 remote catalog experiment preserves pinned source and release access boundaries',()=>{
 const hub=read('lib/discoveryHubServer.ts');
 const cached=read('lib/ownerRemoteCatalogPreviewServer.ts');
 const events=read('app/events-performance-review/page.tsx');
 const style=read('app/style-review/page.tsx');
 assert.match(cached,/'use cache: remote'/);
 assert.match(cached,/cacheLife\('max'\)/);
 assert.match(cached,/STOREFRONT_CACHE_TAGS\.site/);
 assert.match(cached,/STOREFRONT_CACHE_TAGS\.catalog/);
 assert.match(cached,/readApprovedStorefrontCardProductsV1/);
 assert.doesNotMatch(cached,/cookies\(|headers\(|getUser|getSession|closedReview/);
 assert.match(hub,/readClosedReviewPresentation/);
 assert.match(hub,/if\(review\.status==='blocked'\)return null/);
 assert.match(hub,/review\.status==='disabled'&&ownerV2/);
 assert.match(hub,/readCachedApprovedStorefrontCatalogV1/);
 assert.match(hub,/review\.release\.entries/);
 assert.match(events,/owner_hub_catalog_timing/);
 assert.match(style,/owner_hub_catalog_timing/);
 assert.match(events,/kind:'events'/);
 assert.match(style,/kind:'style'/);
});

test('V7 buyer shipping left alignment restored while font hierarchy stays approved',()=>{
 const shipping=read('app/shipping-review/page.tsx');
 assert.match(shipping,/mt-3 text-\[30px\]/);
 assert.match(shipping,/mt-3 text-\[32px\]/);
 assert.match(shipping,/mt-1 text-\[14px\]/);
 assert.doesNotMatch(shipping,/w-full text-center text-\[(?:30|32)px\]/);
 assert.doesNotMatch(shipping,/text-center text-\[14px\]/);
});
test('V7 socials are inside left-hand Contact support, not repeated beneath newsletter',()=>{
 const src=read('components/ContactExperience2026.tsx');
 const social=src.indexOf('aria-label="TheFEYA social profiles"');
 const whatsapp=src.indexOf('wa.me/380636556288');
 const question=src.indexOf('<OwnerContactFormPreview/>');
 const maps=src.indexOf('OwnerLocationMapPreview location="kyiv"');
 const newsletter=src.indexOf('<OwnerNewsletterSignupPreview/>');
 assert.ok(whatsapp>=0&&social>whatsapp&&social<question&&social<maps&&social<newsletter);
 assert.equal(src.split('Follow TheFEYA').length-1,1);
 assert.match(src,/text-\[#817b74\]/);
 assert.match(src,/op\.legalName/);
 assert.match(src,/Privacy Policy/);
});

test('V7 Events/Style share a visible skeleton rather than show an empty 500px gap while waiting',()=>{
 const events=read('app/events-performance-review/page.tsx');
 const style=read('app/style-review/page.tsx');
 const skeleton=read('components/OwnerHubCatalogSkeleton.tsx');
 assert.match(events,/<OwnerHubCatalogSkeleton\/>/);
 assert.match(style,/<OwnerHubCatalogSkeleton\/>/);
 assert.doesNotMatch(events,/min-h-\[500px\]/);
 assert.doesNotMatch(style,/min-h-\[550px\]|CatalogLoading/);
 assert.match(skeleton,/aria-busy="true"/);
 assert.match(skeleton,/grid gap-4 sm:grid-cols-2 lg:grid-cols-4/);
});

test('V8 approved owner mark is an exact image blob in Header slot without changing nav dimensions',()=>{
 const header=read('components/Header.tsx');
 const css=read('app/ownerVisualPreviewV2.css');
 assert.ok(readFileSync('public/thefeya-approved-logo.webp').length>1000);
 assert.match(header,/data-testid="logo-link"/);
 assert.match(css,/thefeya-approved-logo\.webp/);
 assert.match(css,/mix-blend-mode:screen/);
 assert.match(css,/\[data-testid="shop-page"\]:not\(\.visual-commerce-embedded\)/);
});
test('V8 Events includes every requested occasion, without Festival Skirts',()=>{
 const src=read('config/ownerDiscoveryTilesV8.ts');
 const nav=read('config/storefrontNavigation.ts');
 for(const label of ['Rave','Burning Man','Halloween','Pride','Cosplay','Performance','Fashion','Showgirl','Drag Queen','Go-Go Dancer','Pole Dancer'])
   assert.ok(src.includes("'"+label+"'"),label);
 assert.match(nav,/item\.code==='festival_skirts'/);
 assert.match(nav,/NEXT_PUBLIC_FEYA_OWNER_V2_COPY_REVIEW === '1'/);
 assert.doesNotMatch(src.slice(src.indexOf('export const OWNER_EVENTS_HUB_TILES'),src.indexOf('// All ten current real style filters')),/festival-skirts|Festival Skirts/);
});
test('V8 Style includes both verified Burlesque and Classic filters, no personas',()=>{
 const src=read('config/ownerDiscoveryTilesV8.ts');
 const styles=src.slice(src.indexOf('export const OWNER_STYLE_HUB_TILES'));
 assert.ok(styles.includes("'Burlesque'"));
 assert.ok(styles.includes("'Classic'"));
 assert.doesNotMatch(styles,/persona=|Warrior|Queen/);
});
test('V8 image-led visual strip advances every 3 seconds and supports reduced motion, pause, arrows',()=>{
 const src=read('components/OwnerDiscoveryTileStrip.tsx');
 assert.match(src,/\},3000\)/);
 assert.match(src,/prefers-reduced-motion: reduce/);
 assert.match(src,/onMouseEnter=\{\(\)=>setPause\(true\)\}/);
 assert.match(src,/onFocusCapture=\{\(\)=>setPause\(true\)\}/);
 assert.match(src,/document\.visibilityState/);
 assert.match(src,/onClick=\{\(\)=>move\(-1\)\}/);
 assert.match(src,/onClick=\{\(\)=>move\(1\)\}/);
});
test('V8 Contact no longer repeats technical order advice under support',()=>{
 const src=read('components/ContactExperience2026.tsx');
 assert.doesNotMatch(src,/For order questions, include your order number/);
 assert.match(src,/TheFEYA social profiles/);
 assert.match(src,/pt-20 pb-7 sm:pt-24 lg:pt-24/);
});

test('V8 canonical ten owner landing directory stays frozen while only extra carousel filters expand',()=>{
 const canonical=read('config/discoveryHubs.ts');
 const owner=read('config/ownerDiscoveryTilesV8.ts');
 assert.match(canonical,/code:'festival-skirts'/);
 assert.match(canonical,/code:'festival-outfits'/);
 assert.match(owner,/OWNER_EVENTS_HUB_TILES/);
 assert.match(owner,/OWNER_STYLE_HUB_TILES/);
 assert.doesNotMatch(owner,/COLLECTION_DIRECTORY_GROUPS/);
});

test('V8 noindex shop has immediate real-looking loading UI, same exact filters and gated approved shared cache',()=>{
 const shop=read('app/shop-v8-review/page.tsx');
 const main=read('app/shop/page.tsx');
 const cfg=read('next.config.ts');
 assert.match(shop,/if\(!isOwnerUnifiedStorefrontPreview\(process\.env\)\)notFound\(\)/);
 assert.match(shop,/readClosedReviewPresentation/);
 assert.match(shop,/await readOwnerRemoteCatalogPreviewV1\(\)/);
 assert.match(shop,/await readCachedApprovedStorefrontCatalogV1\(\)/);
 assert.match(shop,/owner_shop_catalog_timing/);
 assert.match(shop,/OwnerHubCatalogSkeleton/);
 assert.match(shop,/title: 'Shop'/);
 assert.match(shop,/robots: \{ index:false, follow:false \}/);
 assert.match(shop,/parseShopNavigation/);
 assert.match(shop,/shopNavigationNeedsNormalization/);
 assert.match(shop,/SHOP_PAGE_SIZE/);
 assert.match(cfg,/source: '\/shop', destination: '\/shop-v8-review'/);
 assert.match(main,/readCachedApprovedStorefrontCatalogV1/);
});

test('V9 owner hero baseline is unified across customer information routes and leaves nav/photo heroes untouched',()=>{
 const css=read('app/ownerVisualPreviewV2.css');
 const about=read('components/OwnerEditorialReviewPages.tsx');
 const shipping=read('app/shipping-review/page.tsx');
 const events=read('app/events-performance-review/page.tsx');
 const style=read('app/style-review/page.tsx');
 const cart=read('components/CartOwnerLiveReviewClient.tsx');
 const review=read('app/owner-review/page.tsx');
 const shop=read('app/shop-v8-review/page.tsx');
 for(const s of [about,shipping,events,style,cart,review]){
   assert.match(s,/pt-20/);
   assert.match(s,/sm:pt-24/);
 }
 assert.match(shop,/pt-20 pb-4 sm:pt-24/);
 assert.match(css,/--feya-owner-intro-top: 5rem/);
 assert.match(css,/--feya-owner-intro-top: 6rem/);
 assert.match(css,/shop-page.*:not\(\.visual-commerce-embedded\)/);
 assert.match(css,/thefeya-approved-logo-transparent\.webp/);
 assert.doesNotMatch(css,/mix-blend-mode:screen/);
});
test('V9 Seller Online details are moved to end of Shipping before Footer, not duplicated on Contact',()=>{
 const contact=read('components/ContactExperience2026.tsx');
 const shipping=read('app/shipping-review/page.tsx');
 const partner=read('components/OwnerSellerOnlinePartnerDetails.tsx');
 assert.doesNotMatch(contact,/payment-operator-heading|SELLER_ONLINE_PROVIDER|OwnerSellerOnlinePartnerDetails/);
 assert.match(shipping,/<OwnerSellerOnlinePartnerDetails\/>\s*<Footer\/>/);
 assert.match(partner,/SELLER_ONLINE_PROVIDER/);
 assert.match(partner,/payment-operator-heading/);
 assert.match(partner,/op\.legalName/);
 assert.match(partner,/href="\/privacy"/);
 assert.match(partner,/href="\/terms"/);
});
