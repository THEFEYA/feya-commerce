import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

/** Preserve every existing class/style expression and literal JSX text. Functional
 * href/data/pagination changes are separately verified by the real browser crawl. */
export function visualTokens(source: string) {
  const file=ts.createSourceFile('surface.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const attributes: string[]=[],text: string[]=[];
  const visit=(node: ts.Node)=>{
    if(ts.isJsxAttribute(node)&&['className','style'].includes(node.name.getText(file))) attributes.push(node.getText(file));
    if(ts.isJsxText(node)&&node.text.trim())text.push(node.text.trim());
    ts.forEachChild(node,visit);
  };
  visit(file);
  return createHash('sha256').update(JSON.stringify({attributes,text})).digest('hex');
}

test('release routing and pagination retain all existing visual classes, styles and literal copy',()=>{
  const baseline=JSON.parse(readFileSync('config/closed-review-visual-baseline.json','utf8'));
  for(const [path,hash] of Object.entries(baseline.surfaces))assert.equal(visualTokens(readFileSync(path,'utf8')),hash,path);
  const pagination=readFileSync('components/ShopPagination.tsx','utf8');
  assert.ok(pagination.includes('aria-label="Catalog pages"'));
  assert.equal((pagination.match(/className="btn-ghost"/g)||[]).length,2);
});
