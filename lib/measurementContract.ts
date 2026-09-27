export const FEYA_MEASUREMENT_CONTRACT_VERSION='feya_measurement_event_v1' as const;

export const FEYA_MEASUREMENT_EVENTS=[
  'page_view',
  'select_item',
  'view_item',
  'add_to_cart',
  'begin_checkout',
  'purchase',
  'web_vital',
] as const;

export type FeyaMeasurementEventName=typeof FEYA_MEASUREMENT_EVENTS[number];
export type FeyaAnalyticsConsent='unset'|'denied'|'granted';

export type FeyaMeasurementPageContext={
  page_id:string;
  page_version_id:string|null;
  release_id:string|null;
  canonical_product_id:string|null;
  path:string;
  environment:'production'|'preview'|'development'|'test'|'unknown';
  measurement_enabled:boolean;
  ga4_measurement_id:string|null;
};

export type FeyaMeasurementItem={
  canonical_product_id:string;
  sku_id?:string|null;
  quantity?:number;
  item_price?:number|null;
  item_value?:number|null;
  currency?:string|null;
  item_list_id?:string|null;
};

export type FeyaMeasurementEnvelope={
  contract_version:typeof FEYA_MEASUREMENT_CONTRACT_VERSION;
  event_id:string;
  session_id:string;
  event_name:FeyaMeasurementEventName;
  page_id:string;
  page_version_id:string|null;
  landing_page_id:string;
  release_id:string|null;
  canonical_product_id:string|null;
  consent_state:'granted';
  environment:FeyaMeasurementPageContext['environment'];
  transaction_id?:string;
  server_order_receipt_id?:string;
  currency?:string;
  value?:number;
  items?:FeyaMeasurementItem[];
  metric_name?:'LCP'|'INP'|'CLS';
  metric_value?:number;
  metric_rating?:'good'|'needs-improvement'|'poor';
};

function isUuid(value:string){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function requiredUuid(value:string,label:string){
  if(!isUuid(value))throw new Error(`FEYA_MEASUREMENT_INVALID_${label.toUpperCase()}`);
  return value;
}

export function buildMeasurementEnvelope(input:{
  event_id:string;
  session_id:string;
  event_name:FeyaMeasurementEventName;
  page:FeyaMeasurementPageContext;
  landing_page_id:string;
  canonical_product_id?:string|null;
  items?:FeyaMeasurementItem[];
  transaction_id?:string;
  server_order_receipt_id?:string;
  currency?:string;
  value?:number;
  metric_name?:'LCP'|'INP'|'CLS';
  metric_value?:number;
  metric_rating?:'good'|'needs-improvement'|'poor';
}):FeyaMeasurementEnvelope{
  if(!FEYA_MEASUREMENT_EVENTS.includes(input.event_name))throw new Error('FEYA_MEASUREMENT_EVENT_UNSUPPORTED');
  if(!input.page.measurement_enabled)throw new Error('FEYA_MEASUREMENT_DISABLED_FOR_ENVIRONMENT');
  const event_id=requiredUuid(input.event_id,'event_id');
  const session_id=requiredUuid(input.session_id,'session_id');
  const page_id=requiredUuid(input.page.page_id,'page_id');
  const landing_page_id=requiredUuid(input.landing_page_id,'landing_page_id');

  if(input.event_name==='purchase'){
    if(!input.transaction_id?.trim())throw new Error('FEYA_MEASUREMENT_PURCHASE_TRANSACTION_REQUIRED');
    if(!input.server_order_receipt_id?.trim())throw new Error('FEYA_MEASUREMENT_PURCHASE_SERVER_RECEIPT_REQUIRED');
    if(!input.currency?.trim())throw new Error('FEYA_MEASUREMENT_PURCHASE_CURRENCY_REQUIRED');
    if(typeof input.value!=='number'||!Number.isFinite(input.value)||input.value<0)throw new Error('FEYA_MEASUREMENT_PURCHASE_VALUE_INVALID');
    if(!input.items?.length)throw new Error('FEYA_MEASUREMENT_PURCHASE_ITEMS_REQUIRED');
  }

  for(const item of input.items||[]){
    requiredUuid(item.canonical_product_id,'canonical_product_id');
  }

  if(input.event_name==='web_vital'){
    if(!input.metric_name)throw new Error('FEYA_MEASUREMENT_WEB_VITAL_NAME_REQUIRED');
    if(typeof input.metric_value!=='number'||!Number.isFinite(input.metric_value)||input.metric_value<0)throw new Error('FEYA_MEASUREMENT_WEB_VITAL_VALUE_INVALID');
  }

  return{
    contract_version:FEYA_MEASUREMENT_CONTRACT_VERSION,
    event_id,
    session_id,
    event_name:input.event_name,
    page_id,
    page_version_id:input.page.page_version_id,
    landing_page_id,
    release_id:input.page.release_id,
    canonical_product_id:input.canonical_product_id??input.page.canonical_product_id,
    consent_state:'granted',
    environment:input.page.environment,
    ...(input.transaction_id?{transaction_id:input.transaction_id}:{}),
    ...(input.server_order_receipt_id?{server_order_receipt_id:input.server_order_receipt_id}:{}),
    ...(input.currency?{currency:input.currency}:{}),
    ...(typeof input.value==='number'?{value:input.value}:{}),
    ...(input.items?.length?{items:input.items}:{}),
    ...(input.metric_name?{metric_name:input.metric_name}:{}),
    ...(typeof input.metric_value==='number'?{metric_value:input.metric_value}:{}),
    ...(input.metric_rating?{metric_rating:input.metric_rating}:{}),
  };
}

export function ga4EventParameters(event:FeyaMeasurementEnvelope){
  return{
    event_id:event.event_id,
    session_id:event.session_id,
    page_id:event.page_id,
    page_version_id:event.page_version_id,
    landing_page_id:event.landing_page_id,
    release_id:event.release_id,
    canonical_product_id:event.canonical_product_id,
    consent_state:event.consent_state,
    feya_environment:event.environment,
    transaction_id:event.transaction_id,
    server_order_receipt_id:event.server_order_receipt_id,
    currency:event.currency,
    value:event.value,
    items:event.items?.map((item)=>({
      item_id:item.sku_id||item.canonical_product_id,
      canonical_product_id:item.canonical_product_id,
      sku_id:item.sku_id||undefined,
      quantity:item.quantity,
      price:item.item_price,
      item_value:item.item_value,
      currency:item.currency,
      item_list_id:item.item_list_id,
    })),
    metric_name:event.metric_name,
    metric_value:event.metric_value,
    metric_rating:event.metric_rating,
  };
}
