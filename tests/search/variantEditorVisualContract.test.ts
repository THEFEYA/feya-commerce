import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

export function variantEditorJsxHash(source:string){
  const file=ts.createSourceFile('surface.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),printer=ts.createPrinter({removeComments:true}),nodes:string[]=[];
  const transform:ts.TransformerFactory<ts.Node>=context=>root=>{
    const visit:ts.Visitor=node=>{
      if(ts.isJsxText(node)&&!node.text.trim())return undefined;
      // Documented pointer/viewport repairs only: retain every child, class and visible label.
      if(ts.isCallExpression(node)&&node.expression.getText(file)==='createPortal'&&node.arguments.length===2&&node.arguments[1].getText(file).replace(/\s/g,'')==="document.querySelector('.owner-shell')||document.body"
        &&node.arguments[0].getText(file).startsWith('<div className="fixed inset-0 z-[80]"'))return ts.visitNode(node.arguments[0],visit);
      if(ts.isJsxOpeningElement(node)&&node.tagName.getText(file)==='th'){
        const props=node.attributes.properties.filter(p=>!(ts.isJsxAttribute(p)&&p.name.getText(file)==='style'&&p.initializer?.getText(file).replace(/\s/g,'')==='{{top:0}}'));
        return ts.factory.updateJsxOpeningElement(node,node.tagName,node.typeArguments,ts.factory.updateJsxAttributes(node.attributes,props));
      }
      if(ts.isJsxExpression(node)&&node.expression&&node.expression.getText(file).startsWith('variantDraftEnabled')&&node.expression.getText(file).includes('AdminVariantDraftClient'))return undefined;
      if(ts.isJsxSelfClosingElement(node)&&['AdminProductDetailView','OwnerProductFactDrawerClient'].includes(node.tagName.getText(file))){
        const props=node.attributes.properties.filter(p=>!ts.isJsxAttribute(p)||p.name.getText(file)!=='variantDraftEnabled');
        return ts.factory.updateJsxSelfClosingElement(node,node.tagName,node.typeArguments,ts.factory.updateJsxAttributes(node.attributes,props));
      }
      return ts.visitEachChild(node,visit,context);
    };return ts.visitNode(root,visit) as ts.Node;
  };
  const collect=(node:ts.Node)=>{if(ts.isJsxElement(node)||ts.isJsxSelfClosingElement(node)||ts.isJsxFragment(node)){
    const result=ts.transform(node,[transform]);nodes.push(printer.printNode(ts.EmitHint.Unspecified,result.transformed[0],file));result.dispose();
  }else ts.forEachChild(node,collect);};collect(file);
  return createHash('sha256').update(JSON.stringify(nodes)).digest('hex');
}
test('variant integration preserves prior content and classes outside documented mounts and pointer repairs',()=>{
  const baseline=JSON.parse(readFileSync('config/product-os-variant-jsx-baseline.json','utf8'));
  for(const [path,expected] of Object.entries(baseline.files))assert.equal(variantEditorJsxHash(readFileSync(path,'utf8')),(expected as {sha256:string}).sha256,path);
});
