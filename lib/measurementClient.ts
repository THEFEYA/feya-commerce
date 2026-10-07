'use client';

import type {Metric} from 'web-vitals';
import {createWebVitalsCollector,resolveWebVitalContext} from '@/lib/measurementWebVitals';
import {
  buildMeasurementEnvelope,
  ga4EventParameters,
  type FeyaAnalyticsConsent,
  type FeyaMeasurementEventName,
  type FeyaMeasurementItem,
  type FeyaMeasurementPageContext,
} from '@/lib/measurementContract';

const CONSENT_KEY='feya_analytics_consent_v1';
const SESSION_KEY='feya_measurement_session_v1';
const LANDING_KEY='feya_measurement_landing_page_v1';
const SCRIPT_ID='feya-ga4-loader';

declare global {
  interface Window {
    dataLayer?:unknown[];
    gtag?:(...args:unknown[])=>void;
    __FEYA_MEASUREMENT_STATE__?:{
      context:FeyaMeasurementPageContext|null;
      consent:FeyaAnalyticsConsent;
      sent:number;
      blocked:number;
    };
  }
}

let currentContext:FeyaMeasurementPageContext|null=null;
let sentCount=0;
let blockedCount=0;
let lastPageViewKey='';
const documentPath=typeof window==='undefined'?null:window.location.pathname.replace(/\/+$/,'')||'/';
const vitalContexts=new Map<string,FeyaMeasurementPageContext>();
let documentContextPending:Promise<void>|null=null;

function vitalContext(metric:Metric){
  if(typeof window==='undefined'||!documentPath)return null;
  return resolveWebVitalContext(metric.navigationURL,documentPath,window.location.origin,vitalContexts);
}

function vitalsAllowed(metric?:Metric){
  if(typeof window==='undefined'||getAnalyticsConsent()!=='granted')return false;
  if(!currentContext?.measurement_enabled||currentContext.environment!=='production'
    ||!currentContext.ga4_measurement_id)return false;
  if(window.location.pathname.startsWith('/admin')||window.location.pathname.startsWith('/api'))return false;
  if(!metric)return true;
  const page=vitalContext(metric);
  return Boolean(page?.measurement_enabled&&page.environment==='production'
    &&page.ga4_measurement_id===currentContext.ga4_measurement_id);
}

const webVitals=createWebVitalsCollector({
  load:()=>import('web-vitals'),
  allowed:vitalsAllowed,
  send:(metric)=>{
    const page=vitalContext(metric);
    if(!page||!['LCP','INP','CLS'].includes(metric.name))return false;
    return trackMeasurementEvent('web_vital',{
      metric_name:metric.name as 'LCP'|'INP'|'CLS',
      metric_value:metric.value,
      metric_rating:metric.rating,
      metric_id:metric.id,
      metric_delta:metric.delta,
      metric_navigation_type:metric.navigationType,
    },page).sent;
  },
});

async function startWebVitals(){
  if(!vitalsAllowed()||!documentPath)return;
  if(documentPath.startsWith('/admin')||documentPath.startsWith('/api')){
    webVitals.disable();return;
  }
  // Consent may be granted after an SPA navigation. Buffered document metrics
  // still belong to the original URL, so obtain its own immutable FEYA IDs once.
  if(!vitalContexts.has(documentPath)){
    if(!documentContextPending){
      documentContextPending=(async()=>{
        const response=await fetch(`/api/measurement/context?path=${encodeURIComponent(documentPath)}`,{
          cache:'no-store',headers:{Accept:'application/json'},
        });
        if(!response.ok)return;
        const body=await response.json() as {ok?:boolean;context?:FeyaMeasurementPageContext};
        if(vitalsAllowed()&&body.ok&&body.context?.path===documentPath&&body.context.measurement_enabled
          &&body.context.environment==='production')vitalContexts.set(documentPath,body.context);
      })();
    }
    try{await documentContextPending;}finally{documentContextPending=null;}
  }
  if(vitalContexts.has(documentPath))await webVitals.start();
}

function state(){
  if(typeof window==='undefined')return;
  window.__FEYA_MEASUREMENT_STATE__={
    context:currentContext,
    consent:getAnalyticsConsent(),
    sent:sentCount,
    blocked:blockedCount,
  };
}

export function getAnalyticsConsent():FeyaAnalyticsConsent{
  if(typeof window==='undefined')return'unset';
  try{
    const value=window.localStorage.getItem(CONSENT_KEY);
    return value==='granted'||value==='denied'?value:'unset';
  }catch{return'unset';}
}

function clearSessionIdentity(){
  try{
    window.sessionStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(LANDING_KEY);
  }catch{}
}

function ensureSessionId(){
  let value='';
  try{value=window.sessionStorage.getItem(SESSION_KEY)||'';}catch{}
  if(value)return value;
  value=window.crypto.randomUUID();
  try{window.sessionStorage.setItem(SESSION_KEY,value);}catch{}
  return value;
}

function ensureLandingPageId(pageId:string){
  let value='';
  try{value=window.sessionStorage.getItem(LANDING_KEY)||'';}catch{}
  if(value)return value;
  try{window.sessionStorage.setItem(LANDING_KEY,pageId);}catch{}
  return pageId;
}

function gtag(...args:unknown[]){
  window.dataLayer=window.dataLayer||[];
  window.dataLayer.push(args);
}

function ensureGoogleTag(){
  if(typeof window==='undefined'||!currentContext?.measurement_enabled||!currentContext.ga4_measurement_id)return false;
  if(getAnalyticsConsent()!=='granted')return false;
  const measurementId=currentContext.ga4_measurement_id;
  window.gtag=window.gtag||gtag;
  if(!document.getElementById(SCRIPT_ID)){
    window.gtag('consent','default',{
      analytics_storage:'granted',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied',
    });
    window.gtag('js',new Date());
    window.gtag('config',measurementId,{send_page_view:false});
    const script=document.createElement('script');
    script.id=SCRIPT_ID;
    script.async=true;
    script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }
  return true;
}

export function setAnalyticsConsent(value:'granted'|'denied'){
  if(typeof window==='undefined')return;
  try{window.localStorage.setItem(CONSENT_KEY,value);}catch{}
  if(value==='denied'){
    webVitals.disable();
    vitalContexts.clear();
    clearSessionIdentity();
    window.gtag?.('consent','update',{
      analytics_storage:'denied',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied',
    });
  }else{
    ensureGoogleTag();
    window.gtag?.('consent','update',{
      analytics_storage:'granted',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied',
    });
  }
  state();
  window.dispatchEvent(new Event('feya:analytics-consent'));
}

export function setMeasurementPageContext(context:FeyaMeasurementPageContext|null){
  currentContext=context;
  if(context){
    ensureGoogleTag();
    if(context.measurement_enabled&&context.environment==='production'&&!vitalContexts.has(context.path)){
      vitalContexts.set(context.path,context);
    }
    void startWebVitals().catch(()=>{});
  }else if(typeof window!=='undefined'
    &&(window.location.pathname.startsWith('/admin')||window.location.pathname.startsWith('/api'))){
    webVitals.disable();
    vitalContexts.clear();
  }
  state();
}

export function trackMeasurementEvent(
  eventName:FeyaMeasurementEventName,
  input:{
    canonical_product_id?:string|null;
    items?:FeyaMeasurementItem[];
    transaction_id?:string;
    server_order_receipt_id?:string;
    currency?:string;
    value?:number;
    metric_name?:'LCP'|'INP'|'CLS';
    metric_value?:number;
    metric_rating?:'good'|'needs-improvement'|'poor';
    metric_id?:string;
    metric_delta?:number;
    metric_navigation_type?:string;
  }={},
  pageContext:FeyaMeasurementPageContext|null=currentContext,
){
  if(typeof window==='undefined'||!currentContext||!pageContext){
    blockedCount+=1;state();return{sent:false,reason:'context_unavailable'} as const;
  }
  if(getAnalyticsConsent()!=='granted'){
    blockedCount+=1;state();return{sent:false,reason:'consent_not_granted'} as const;
  }
  if(!currentContext.measurement_enabled||pageContext.environment!=='production'
    ||pageContext.ga4_measurement_id!==currentContext.ga4_measurement_id||!ensureGoogleTag()){
    blockedCount+=1;state();return{sent:false,reason:'measurement_disabled'} as const;
  }

  const envelope=buildMeasurementEnvelope({
    event_id:window.crypto.randomUUID(),
    session_id:ensureSessionId(),
    event_name:eventName,
    page:pageContext,
    landing_page_id:ensureLandingPageId(currentContext.page_id),
    ...input,
  });

  window.gtag?.('event',eventName,{
    ...ga4EventParameters(envelope),
    ...(eventName==='web_vital'?{
      page_location:`${window.location.origin}${pageContext.path}`,
      value:input.metric_delta??input.metric_value,
    }:{}),
  });
  sentCount+=1;
  state();
  window.dispatchEvent(new CustomEvent('feya:measurement',{detail:envelope}));
  return{sent:true,envelope} as const;
}

export function trackPageView(){
  if(!currentContext)return{sent:false,reason:'context_unavailable'} as const;
  const key=`${currentContext.page_id}:${currentContext.page_version_id||''}:${location.pathname}:${location.search}`;
  if(key===lastPageViewKey)return{sent:false,reason:'duplicate_page_view'} as const;
  const result=trackMeasurementEvent('page_view');
  if(result.sent)lastPageViewKey=key;
  return result;
}

export function trackEcommerceEvent(
  eventName:'select_item'|'view_item'|'add_to_cart'|'begin_checkout',
  item:FeyaMeasurementItem,
  extra:{currency?:string;value?:number}={}
){
  return trackMeasurementEvent(eventName,{
    canonical_product_id:item.canonical_product_id,
    items:[item],
    ...extra,
  });
}
