-- Phase G K18: register the storefront measurement contract as code-ready but default-off.
-- This does not enable GA4, create analytics consent, or change indexation/payment state.
begin;

insert into public.feya_growth_registry_items_v1(
  registry_type,item_code,item_name,owner_role,item_state,implementation_state,
  public_summary,limitations_summary,config_json,evidence_json,version_no,active_flag
)
values(
  'capability',
  'STOREFRONT_MEASUREMENT_CONTRACT',
  'Storefront stable-ID measurement contract',
  'GMEL',
  'AVAILABLE_WITH_LIMITATIONS',
  'code_ready_default_off',
  'Storefront events can carry FEYA stable page/product/release/session/event identifiers through an explicit consent- and environment-gated contract.',
  'Production GA4 collection remains disabled until a real GA4 web stream, final privacy/consent UX and production environment configuration exist. Purchase events additionally require a real transaction ID and server order receipt.',
  '{
    "contract_version":"feya_measurement_event_v1",
    "default_state":"off",
    "production_only":true,
    "explicit_analytics_consent_required":true,
    "private_surfaces_excluded":["/admin","/api"],
    "events":["page_view","select_item","view_item","add_to_cart","begin_checkout","purchase","web_vital"],
    "required_stable_ids":["event_id","session_id","page_id","landing_page_id"],
    "optional_context_ids":["page_version_id","release_id","canonical_product_id","sku_id"],
    "purchase_requires":["transaction_id","server_order_receipt_id","currency","value","items"],
    "ad_storage_default":"denied",
    "ad_user_data_default":"denied",
    "ad_personalization_default":"denied"
  }'::jsonb,
  '{
    "code":["lib/measurementContract.ts","lib/measurementClient.ts","components/MeasurementRuntime.tsx","app/api/measurement/context/route.ts"],
    "research_basis":"FEYA measurement architecture: first-party event/session/page/product IDs; consent/env separation; GA4 BigQuery as downstream raw analytics source",
    "release_gate":"K18"
  }'::jsonb,
  1,
  true
)
on conflict (registry_type,item_code,version_no) do update set
  item_name=excluded.item_name,
  owner_role=excluded.owner_role,
  item_state=excluded.item_state,
  implementation_state=excluded.implementation_state,
  public_summary=excluded.public_summary,
  limitations_summary=excluded.limitations_summary,
  config_json=excluded.config_json,
  evidence_json=excluded.evidence_json,
  active_flag=excluded.active_flag,
  updated_at=now();

commit;
