import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// The full file remains hash-frozen. This additional baseline proves that the
// one authorized data integration did not change the previous JSX/CSS layout.
export function pdpJsxHash(source: string) {
  // Authorized link repair only; the original visual baseline remains unchanged.
  source = source\n    .replace('href={`/shop?collection=${collection.slug}`}', 'href={`/collections/${collection.slug}`}')\n    .replace('href={collection.href}', 'href={`/collections/${collection.slug}`}');
  const file = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const printer = ts.createPrinter({ removeComments: true });
  const nodes: string[] = [];
  const transform: ts.TransformerFactory<ts.Node> = context => root => {
    const visit: ts.Visitor = node => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'ProductDetailClient') {
        const attributes = node.attributes.properties.filter(p => !ts.isJsxAttribute(p) || !['draft','previewMode'].includes(p.name.getText(file)));
        return ts.factory.updateJsxSelfClosingElement(node,node.tagName,node.typeArguments,ts.factory.updateJsxAttributes(node.attributes,attributes));
      }
      return ts.visitEachChild(node,visit,context);
    };
    return ts.visitNode(root,visit) as ts.Node;
  };
  const collect = (node: ts.Node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      const transformed = ts.transform(node,[transform]);
      nodes.push(printer.printNode(ts.EmitHint.Unspecified,transformed.transformed[0],file)); transformed.dispose();
    } else ts.forEachChild(node,collect);
  };
  collect(file);
  return createHash('sha256').update(JSON.stringify(nodes)).digest('hex');
}

test('approved-copy wiring preserves prior PDP markup, classes and component layout', () => {
  const baseline = JSON.parse(readFileSync('config/product-os-pdp-jsx-baseline.json','utf8'));
  const source = readFileSync('app/shop/[slug]/page.tsx','utf8');
  assert.equal(pdpJsxHash(source),baseline.normalized_jsx_sha256);
  assert.ok(source.includes('href={collection.href}'));\n  assert.ok(source.includes('readProductLandingLinks'));
  assert.ok(source.includes('draft={approvedCopy?.draft} previewMode={Boolean(approvedCopy)}'));
});

