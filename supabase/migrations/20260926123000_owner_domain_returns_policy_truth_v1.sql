-- Human Owner business truth update from 26 Sep 2026.
-- Records the current TheFEYA domain and commercial return/exchange/cancellation policy.
-- Legal implementation must preserve non-waivable consumer rights in the buyer's applicable jurisdiction.
begin;

update public.feya_commerce_business_truth_v1
set status='RETIRED',valid_to=now(),updated_at=now()
where truth_code='ORDER_CANCELLATIONS'
  and scope_type='GLOBAL' and scope_key='GLOBAL' and locale='en'
  and status='ACTIVE' and valid_to is null;

insert into public.feya_commerce_business_truth_v1(
  truth_code,truth_type,scope_type,scope_key,locale,value_json,public_copy,status,version_no,authority_type,source_note
) values
(
  'PUBLIC_SITE_DOMAIN','BRAND','GLOBAL','GLOBAL','en',
  '{"canonical_domain":"https://thefeya.com"}'::jsonb,
  'TheFEYA official store: https://thefeya.com',
  'ACTIVE',1,'HUMAN_OWNER',
  'Owner confirmed thefeya.com as the store domain on 2026-09-26.'
),
(
  'ORDER_CANCELLATIONS','CANCELLATION','GLOBAL','GLOBAL','en',
  '{"store_policy_cancellations_allowed":false,"made_to_order_rationale":true,"mandatory_law_override":true}'::jsonb,
  'Because TheFEYA pieces enter made-to-order production promptly, orders are final once placed and cannot be cancelled under our store policy. This does not limit any mandatory rights that cannot legally be waived.',
  'ACTIVE',2,'HUMAN_OWNER',
  'Owner superseded the older 24-hour cancellation wording: no discretionary order cancellations.'
),
(
  'RETURN_POLICY_CURRENT','RETURNS','GLOBAL','GLOBAL','en',
  '{"voluntary_refund_for_change_of_mind":false,"primary_remedies":["adjustment","repair","remake","replacement","exchange","store_credit"],"defect_or_wrong_item_exception":true,"mandatory_law_override":true}'::jsonb,
  'TheFEYA does not offer discretionary use-and-return refunds. If an item is defective, materially different from the order, or the agreed size, color or configuration was supplied incorrectly, contact us promptly so we can arrange an appropriate adjustment, repair, remake, replacement or other remedy. Any non-waivable rights under applicable law remain unaffected.',
  'ACTIVE',2,'HUMAN_OWNER',
  'Owner confirmed replacement/remake/exchange-first policy designed to prevent post-event free-rental returns.'
),
(
  'RETURN_NOTICE_WINDOW','RETURNS','GLOBAL','GLOBAL','en',
  '{"voluntary_resolution_notice_days":7,"preferred_notice_days_min":1,"preferred_notice_days_max":3,"mandatory_law_override":true}'::jsonb,
  'Please inspect your order on delivery and contact us as soon as possible if something is wrong — ideally within 1–3 days and no later than 7 days for our voluntary exchange/remake process. This store notice window does not shorten any mandatory legal rights.',
  'ACTIVE',1,'HUMAN_OWNER',
  'Owner asked customers to report issues immediately and within one week so post-event use cannot be presented as an initial fit problem.'
),
(
  'DISCOUNTED_ITEM_RETURN_TREATMENT','RETURNS','GLOBAL','GLOBAL','en',
  '{"voluntary_sale_item_remedy":"store_credit","defect_or_wrong_item_exception":true,"mandatory_law_override":true}'::jsonb,
  'For any voluntary return or exchange that we agree to accept on a sale item, the remedy is store credit. This does not replace mandatory remedies for defects, incorrect items, or any other rights that cannot legally be waived.',
  'ACTIVE',2,'HUMAN_OWNER',
  'Owner confirmed store-credit treatment for voluntary sale-item remedies, with legal/non-conformity exceptions.'
),
(
  'CUSTOM_OR_MADE_TO_MEASURE_RETURNS','RETURNS','GLOBAL','GLOBAL','en',
  '{"final_sale_store_policy":true,"applies_to":["made_to_measure","personalized","non_standard_size","non_standard_material","non_standard_color","custom_configuration"],"defect_or_wrong_item_exception":true,"mandatory_law_override":true}'::jsonb,
  'Made-to-measure, personalised and non-standard custom orders are final sale under our store policy. If we made the item incorrectly, supplied the wrong item, or the item is defective, contact us for a remedy. Mandatory legal rights remain unaffected.',
  'ACTIVE',1,'HUMAN_OWNER',
  'Owner confirmed custom/made-to-measure orders should not be treated as free-rental returns.'
),
(
  'EVENT_OR_SHOOT_CHANGE_POLICY','CLAIM_POLICY','GLOBAL','GLOBAL','en',
  '{"customer_event_change_is_refund_reason":false,"weather_is_refund_reason":false,"shoot_cancellation_is_refund_reason":false,"third_party_delay_is_refund_reason":false}'::jsonb,
  'A cancelled or changed event, photoshoot, performance, weather condition, missed call time, or other circumstance outside TheFEYA’s control is not a reason for a voluntary cancellation or refund.',
  'ACTIVE',1,'HUMAN_OWNER',
  'Owner confirmed event-specific external circumstances do not create a discretionary refund right.'
),
(
  'CUSTOMS_DUTIES_RESPONSIBILITY','CUSTOMS_DUTIES','GLOBAL','GLOBAL','en',
  '{"buyer_responsible_for_import_charges_where_applicable":true,"buyer_must_cooperate_with_customs":true,"mandatory_law_override":true}'::jsonb,
  'Import duties, taxes, customs charges and carrier clearance fees are the buyer’s responsibility where applicable. The buyer is responsible for responding to customs or carrier requests needed to complete delivery. Failure to cooperate with customs does not create a voluntary cancellation right; any mandatory legal rights remain unaffected.',
  'ACTIVE',1,'HUMAN_OWNER',
  'Owner confirmed buyer responsibility for destination import/clearance charges and cooperation with customs.'
),
(
  'CARRIER_DELAY_EVENT_DEADLINE_POLICY','SHIPPING','GLOBAL','GLOBAL','en',
  '{"event_date_guaranteed":false,"carrier_or_customs_delay_is_voluntary_refund_reason":false,"lost_or_damaged_claims_follow_applicable_law":true}'::jsonb,
  'Delivery estimates are not event-date guarantees. Carrier or customs delays outside TheFEYA’s control do not create a voluntary cancellation right merely because an event date was missed. Lost or damaged shipment claims are handled according to applicable law and the relevant carrier process.',
  'ACTIVE',1,'HUMAN_OWNER',
  'Owner confirmed no event-date guarantee while avoiding a blanket waiver of legally non-waivable delivery obligations.'
),
(
  'CHECKOUT_POLICY_ACKNOWLEDGEMENT','CLAIM_POLICY','GLOBAL','GLOBAL','en',
  '{"explicit_checkbox_required":true,"prechecked_forbidden":true,"evidence_fields":["policy_version","accepted_at","order_or_checkout_id","selected_configuration","quoted_price","shipping_method"],"mandatory_law_override":true}'::jsonb,
  'Before placing an order, the customer must actively confirm that they have read and agree to the current Terms, Return & Exchange Policy and Shipping Policy. The acknowledgement records the policy version and checkout details and does not waive any rights that cannot legally be waived.',
  'ACTIVE',1,'HUMAN_OWNER',
  'Owner requested an explicit checkout checkbox to create clear policy acceptance evidence for disputes and chargebacks.'
)
on conflict (truth_code,scope_type,scope_key,locale,version_no) do nothing;

notify pgrst,'reload schema';
commit;
