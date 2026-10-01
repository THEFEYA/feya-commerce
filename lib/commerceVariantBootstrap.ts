import {createHash} from 'node:crypto';
import {parseVariantDraftInput, type VariantDraftInput} from './commerceVariantDraftSchema.ts';
import type {VariantDraftContext} from './commerceVariantDraftStorage.ts';

type ExplicitColorBinding={
  configuration_price_id:string;
  label:string;
};

const NAMESPACE='4d8d5de0-3fcb-4fc4-9fe4-aeb6cd4dc632';

function uuidBytes(value:string){
  const hex=value.replaceAll('-','');
  if(!/^[0-9a-f]{32}$/i.test(hex))throw new Error('variant_bootstrap_uuid_invalid');
  return Buffer.from(hex,'hex');
}

function uuidV5(name:string,namespace=NAMESPACE){
  const hash=createHash('sha1').update(Buffer.concat([uuidBytes(namespace),Buffer.from(name,'utf8')])).digest();
  hash[6]=(hash[6]&0x0f)|0x50;
  hash[8]=(hash[8]&0x3f)|0x80;
  const hex=hash.subarray(0,16).toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function cleanCurrency(value:string|null){
  if(!value||!/^[A-Z]{3}$/.test(value))throw new Error('variant_bootstrap_currency_invalid');
  return value;
}

function stableRequestId(context:VariantDraftContext,mode:'configuration'|'explicit-color'){
  return uuidV5(`request:${context.canonical_product_id}:${context.source_bindings.product_fingerprint}:${mode}`);
}

function quoteId(productId:string,configurationPriceId:string){
  return uuidV5(`quote:${productId}:${configurationPriceId}`);
}

function variantId(productId:string,configurationPriceId:string,colorId:string|null){
  return uuidV5(`variant:${productId}:${configurationPriceId}:${colorId??'-'}:-`);
}

function colorId(productId:string,label:string){
  return uuidV5(`color:${productId}:${label.trim().toLocaleLowerCase('en-US')}`);
}

export function buildInitialVariantBootstrapDraft(
  context:VariantDraftContext,
  explicitColors:ExplicitColorBinding[]=[]
):VariantDraftInput{
  if(context.current_revision!==0||context.snapshot!==null||context.snapshot_sha256!==null)
    throw new Error('variant_bootstrap_requires_empty_product_revision');
  if(context.configuration_context.length<1)
    throw new Error('variant_bootstrap_configuration_missing');

  const byConfig=new Map(explicitColors.map(row=>[row.configuration_price_id,row.label.trim()]));
  if(byConfig.size!==explicitColors.length||explicitColors.some(row=>!row.label.trim()))
    throw new Error('variant_bootstrap_color_binding_invalid');
  for(const key of byConfig.keys()){
    if(!context.configuration_context.some(row=>row.configuration_price_id===key))
      throw new Error('variant_bootstrap_color_scope_invalid');
  }

  const colorsByLabel=new Map<string,{id:string;label:string;state:'confirmed'}>();
  for(const label of byConfig.values()){
    const key=label.toLocaleLowerCase('en-US');
    if(!colorsByLabel.has(key))colorsByLabel.set(key,{id:colorId(context.canonical_product_id,label),label,state:'confirmed'});
  }

  const configurations=context.configuration_context.map(row=>({
    configuration_price_id:row.configuration_price_id,
    sellable_configuration_id:row.sellable_configuration_id,
    base_price:{
      quote_id:quoteId(context.canonical_product_id,row.configuration_price_id),
      price_revision:1,
      status:'unverified' as const,
      amount_minor:null,
      currency:cleanCurrency(row.source_currency),
      evidence_ref:`configuration-price:${row.configuration_price_id}`,
    },
  }));

  const variants=context.configuration_context.map(row=>{
    const label=byConfig.get(row.configuration_price_id)??null;
    const boundColor=label?colorsByLabel.get(label.toLocaleLowerCase('en-US'))!:null;
    return{
      variant_id:variantId(context.canonical_product_id,row.configuration_price_id,boundColor?.id??null),
      configuration_price_id:row.configuration_price_id,
      color_id:boundColor?.id??null,
      size_id:null,
      state:'draft' as const,
      pricing:{mode:'configuration_base' as const},
    };
  });

  const input:VariantDraftInput={
    contract_version:'product_variant_draft_v1',
    request_id:stableRequestId(context,explicitColors.length?'explicit-color':'configuration'),
    expected_revision:0,
    source_bindings:structuredClone(context.source_bindings),
    snapshot:{
      canonical_product_id:context.canonical_product_id,
      product_revision:1,
      pricing_policy_ref:'owner-configuration-base-price-20260924-04',
      configurations,
      colors:[...colorsByLabel.values()],
      sizes:[],
      variants,
    },
  };

  parseVariantDraftInput(input,context.canonical_product_id);
  return input;
}
