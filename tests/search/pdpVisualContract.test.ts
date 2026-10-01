import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// The visible PDP markup remains hash-frozen. Functional collection href/data
// routing is normalized out so the visual contract tests only visual structure.
export function pdpJsxHash(source: string) {
  // Route-level Suspense is delivery plumbing, not part of the frozen resolved PDP.
  // Normalize it back to the prior async page shape before hashing visible markup.
  const wrapperStart = source.indexOf('export default function ProductPage(props: PageProps)');
  const resolvedMarker = 'async function ResolvedProductPage({ params }: PageProps) {';
  const resolvedStart = source.indexOf(resolvedMarker);
  if (wrapperStart >= 0 && resolvedStart > wrapperStart) {
    source = source.slice(0, wrapperStart)
      + source.slice(resolvedStart).replace(resolvedMarker, 'export default async function ProductPage({ params }: PageProps) {');
  }
  source = source
    .replace('href={collection.href}', 'href={\`/shop?collection=\${collection.slug}\`}')
    // Phase 11 adds a non-visual BreadcrumbList JSON-LD node. Remove exactly that
    // line before the JSX AST visual hash so the frozen UI baseline still measures
    // visible structure rather than structured-data plumbing.
    .split('\n')
    .filter(line => !line.includes('JSON.stringify(breadcrumbLd)'))
    .join('\n');

  const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const printer = ts.createPrinter({ removeComments: true });
  const nodes: string[] = [];
  const transform: ts.TransformerFactory<ts.Node> = context => root => {
    const visit: ts.Visitor = node => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'ProductDetailClient') {
        const attributes = node.attributes.properties.filter(
          p => !ts.isJsxAttribute(p) || !['draft','previewMode'].includes(p.name.getText(file)),
        );
        return ts.factory.updateJsxSelfClosingElement(
          node,
          node.tagName,
          node.typeArguments,
          ts.factory.updateJsxAttributes(node.attributes, attributes),
        );
      }
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitNode(root, visit) as ts.Node;
  };
  const collect = (node: ts.Node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      const transformed = ts.transform(node, [transform]);
      nodes.push(printer.printNode(ts.EmitHint.Unspecified, transformed.transformed[0], file));
      transformed.dispose();
    } else {
      ts.forEachChild(node, collect);
    }
  };
  collect(file);
  return createHash('sha256').update(JSON.stringify(nodes)).digest('hex');
}

test('approved-copy wiring preserves prior PDP markup, classes and component layout', () => {
  const baseline = JSON.parse(readFileSync('config/product-os-pdp-jsx-baseline.json','utf8'));
  const source = readFileSync('app/shop/[slug]/page.tsx','utf8');
  assert.equal(pdpJsxHash(source), baseline.normalized_jsx_sha256);
  assert.ok(source.includes('href={`/collections/${collection.slug}`}'));
  assert.ok(source.includes('readProductLandingLinks'));
  assert.ok(source.includes('const allowHybridPreviewCommerce = isHybridVisualPreviewDeployment(process.env);'));
  assert.ok(source.includes('draft={approvedCopy?.draft} previewMode={Boolean(approvedCopy) && !allowHybridPreviewCommerce}'));
});

test('hybrid PDP keeps the purchase reminder sweep while approved SEO copy is projected', () => {
  const css = readFileSync('app/globals.css','utf8');
  assert.ok(css.includes("[data-testid='product-page'] aside .btn-gold.w-full.mt-2::before"));
  assert.ok(css.includes("[data-testid='product-page'] aside .btn-chrome:not(.w-full)::before"));
  assert.ok(css.includes('animation: feyaBuySweep 5s ease-in-out infinite'));
});

test('PDP keeps the approved SEO description contract and code-owned support column', () => {
  const source = readFileSync('components/ProductDetailClient.tsx','utf8');
  assert.ok(source.includes('about_this_piece: 0'));
  assert.ok(source.includes('why_youll_love_it: 1'));
  assert.ok(source.includes('ideal_for: 2'));
  assert.ok(source.includes('main_description: 3'));
  assert.ok(source.includes('index === 0 && includedLines.length'));
  assert.ok(source.includes('<IncludedDetail'));
  assert.ok(source.includes('resolveThefeyaRightPdpPanel'));
});


test('hybrid homepage discovery tiles reuse the product-card hover sheen language', () => {
  const page = readFileSync('app/page.tsx','utf8');
  const carousel = readFileSync('components/HomePieceCarousel.tsx','utf8');
  const css = readFileSync('app/globals.css','utf8');
  assert.ok(page.includes('visual-hover-sheen group relative aspect-[3/4]'));
  assert.ok(carousel.includes('visual-hover-sheen group relative aspect-[4/5]'));
  assert.ok(css.includes('.visual-hover-sheen::after'));
  assert.ok(css.includes('linear-gradient(110deg, transparent 30%, rgba(255,255,255,.18) 50%, transparent 70%)'));
  assert.ok(css.includes('.visual-hover-sheen:hover::after'));
});

test('hybrid PDP projects option labels from the same approved SEO decision snapshot', () => {
  const page = readFileSync('app/shop/[slug]/page.tsx','utf8');
  const server = readFileSync('lib/seoApprovedStorefrontServer.ts','utf8');
  assert.ok(page.includes('projectApprovedOfferSnapshot(result.product, approved.offerSnapshot)'));
  assert.ok(server.includes("client.from('feya_commerce_seo_pack_drafts_v1')"));
  assert.ok(server.includes(".eq('id', matches[0].draft_id)"));
  assert.ok(server.includes('manual_focus_snapshot,product_truth_snapshot'));
  assert.ok(server.includes('sellable_offer_signature'));
  assert.ok(server.includes('optional_configurations'));
});


test('PDP metadata/schema helpers stay defined during Phase 6 data-path swaps', () => {
  const source = readFileSync('app/shop/[slug]/page.tsx','utf8');
  assert.match(source,/function canonicalProductUrl\(/);
  assert.match(source,/function productDescription\(/);
  assert.match(source,/function productImages\(/);
  assert.match(source,/function productJsonLd\(/);
  assert.match(source,/const jsonLd = productJsonLd\(product, slug, approvedCopy\)/);
});
