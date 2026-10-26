/** Six exact source-proven buyer options; never modify Product Truth snapshots.
 * This checkout/PDP presentation adapter runs AFTER the immutable owner corrections.
 */
// Launch checkpoint 2026-10-26: these SIX exact listing identities had only
// six source SKU IDs hidden by the old normalized-label deduplication.
// Restored names are grounded in original Seller/Etsy option_mappings.raw_option_value
// and their distinct existing configuration_price_id / public_price_amount.
// No SEO copy, configuration identity, public price or source row is changed.
const FINAL_SOURCE_CONFIRMED_SELECTION_REPAIRS: Record<string, Record<string, Record<string, any>>> = {
  // Etsy 1765624488: source-reviewed Women's Outfit + Men's Outfit +
  // one real Full Set SKU. Original owner batch08 correction verifies both
  // component rows and builds their set; it uses physical component codes
  // rather than literal women_outfit/men_outfit membership.
  '057fbd51-52f5-4404-b126-e5d75b8599f4': {
    '26274d0c-81c9-44e6-9ce7-c3056c62040c': {source_confirmed_paired_outfits:true},
  },
  // Etsy 4348580005: Одно плечо / Полные плечи.
  'b6e0171f-4d42-4d71-88b1-ee0d4e0e109e': {
    '698d3ae1-bae2-4979-9223-f4f2be850338': {public_label:'Single Shoulder'},
    'c1c6a9e3-e86d-4306-83a0-0fe06392d31f': {public_label:'Both Shoulders'},
  },
  // Etsy 1884800699: Боди (ткань) / Кожаный боди.
  '1dbf149a-739c-4afa-ba59-3b5f99acfb77': {
    '5bad7747-b629-4778-b5d4-2103bdce0708': {public_label:'Fabric Bodysuit'},
    '63b51819-01f1-49e6-adfd-87c4bf5c78a3': {public_label:'Leather Bodysuit'},
  },
  // Etsy 1866805089: Воротник / Воротник+Юбка.
  'b6fe4fd9-400d-4fc4-a6e1-2e1dee936371': {
    '75be1f97-9584-430a-b9d4-223f49796096': {public_label:'Collar'},
    'ec9b1e8c-c106-42c2-8d69-443bf0209ac2': {
      public_label:'Collar + Skirt',component_code:'collar_skirt',component_family:'Bundle',
      is_bundle:true,source_confirmed_bundle_members:true,
      bundle_component_codes:['collar','skirt'],bundle_component_labels:['Collar','Skirt'],
    },
  },
  // Etsy 1764754572: Браслеты для ног / Браслеты на руку.
  '6739b15c-f2f3-4a26-9e2a-3a0b5a3e2d2f': {
    'bf2f63b4-d995-43c6-b72c-36af6edc4d6b': {public_label:'Leg Bracelets',component_code:'legs',component_family:'Legs'},
    '8d5b5249-aaaf-40fb-accc-8b07aaaa7fae': {public_label:'Arm Bracelets',component_code:'arms',component_family:'Arms'},
  },
  // Etsy 4462077381: Чехлы для ног / Боди+Чехлы для ног.
  'a3aa7148-889a-42de-9d2d-2e0fca631ed4': {
    'bab1fc8b-1018-4291-801d-fc478b734eea': {public_label:'Leg Covers'},
    '202ce776-f02c-4f2f-aa93-8e803e7c2ba5': {
      public_label:'Bodysuit + Leg Covers',component_code:'bodysuit_legs',component_family:'Bundle',
      is_bundle:true,source_confirmed_bundle_members:true,
      bundle_component_codes:['bodysuit','legs'],bundle_component_labels:['Bodysuit','Leg Covers'],
    },
  },
  // Etsy 1780729637: Чехлы для ног / Боди+Чехлы для ног.
  'a767a1c1-65e7-4c0a-bd18-7a92f8ea4986': {
    '95b12a71-2903-42ea-b1fa-93a59db60a35': {public_label:'Leg Covers'},
    'b804be30-7acd-4e09-82d3-74ca1b64db1c': {
      public_label:'Bodysuit + Leg Covers',component_code:'bodysuit_legs',component_family:'Bundle',
      is_bundle:true,source_confirmed_bundle_members:true,
      bundle_component_codes:['bodysuit','legs'],bundle_component_labels:['Bodysuit','Leg Covers'],
    },
  },
};


function optionId(row:Record<string,any>){
  return String(row.configuration_id||row.configuration_price_id||row.source_price_row_id||'');
}
export function restoreSourceProvenPurchaseOptions<T extends Record<string,any>>(product:T):T{
  const selected=FINAL_SOURCE_CONFIRMED_SELECTION_REPAIRS[String(product?.canonical_product_id||'')];
  if(!selected||!Array.isArray(product.configurations))return product;
  if(!Object.keys(selected).every(id=>product.configurations.some(
    (row:Record<string,any>)=>optionId(row)===id
  )))return product; // never synthesize or borrow an unavailable source SKU
  const configurations=product.configurations.map((row:Record<string,any>)=>{
    const update=selected[optionId(row)];
    return update?{...row,...update,needs_label_review:false}:row;
  });
  return {...product,configurations,
    needs_label_review:configurations.some((row:Record<string,any>)=>row.needs_label_review===true)} as T;
}
