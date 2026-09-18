-- Owner-authorized on 2026-09-17: both partner outfits, EUR 50 below their separate total.
-- Data-only, idempotent operation. Existing prices/source imports are never modified.
begin;
do $owner_bundle$
declare
  v_product uuid := '057fbd51-52f5-4404-b126-e5d75b8599f4';
  v_configuration uuid;
  v_total numeric;
  v_currency text;
begin
  select sum(public_price_amount), min(source_currency) into v_total,v_currency
  from public.feya_commerce_configuration_prices
  where canonical_product_id=v_product
    and configuration_price_id in ('aefa2c61-c430-4675-9964-9cd1e3f1658e','5074ad3c-af6a-4cf7-9624-ce351ee9cafc');
  if v_total is distinct from 510.44 or v_currency is distinct from 'EUR'
    or (select count(*) from public.feya_commerce_configuration_prices where canonical_product_id=v_product
      and configuration_price_id in ('aefa2c61-c430-4675-9964-9cd1e3f1658e','5074ad3c-af6a-4cf7-9624-ce351ee9cafc')
      and source_currency='EUR') <> 2 then
    raise exception 'Partner prices/currency changed; review the authorized calculation first';
  end if;
  insert into public.feya_commerce_sellable_configurations
    (canonical_product_id,configuration_name,normalized_key,is_default_whole_product,is_public_candidate,sort_order,review_status,notes)
  values (v_product,'Full Set','full_set_couple_owner_20260917',true,true,3,'approved',
    'Owner authorized both outfits together on 2026-09-17. Women: Choker, Top, Skirt, Bracelets. Men: Choker, Shoulders, Bicep Piece, Bracelet. Includes both complete partner outfits; not an Etsy-imported option.')
  on conflict (canonical_product_id,normalized_key) do nothing;
  select sellable_configuration_id into strict v_configuration
  from public.feya_commerce_sellable_configurations where canonical_product_id=v_product and normalized_key='full_set_couple_owner_20260917';
  if exists (select 1 from public.feya_commerce_configuration_prices where sellable_configuration_id=v_configuration
    and (public_price_amount is distinct from round(v_total-50,2) or source_currency is distinct from 'EUR')) then
    raise exception 'Existing couple full-set price differs; do not overwrite';
  end if;
  insert into public.feya_commerce_configuration_prices
    (canonical_product_id,sellable_configuration_id,source_currency,public_price_amount,manual_override_amount,confidence,review_status,price_status,notes)
  select v_product,v_configuration,'EUR',round(v_total-50,2),round(v_total-50,2),100,'approved','approved',
    'Owner price authorization 2026-09-17: EUR183.44 + EUR327.00 - EUR50.00 = EUR460.44. Actual saving versus two separately purchasable outfits, not a former price. No fabricated source import.'
  where not exists (select 1 from public.feya_commerce_configuration_prices where sellable_configuration_id=v_configuration);
end $owner_bundle$;
commit;
select cp.configuration_price_id,cp.sellable_configuration_id,cp.public_price_amount,cp.source_currency,sc.configuration_name
from public.feya_commerce_configuration_prices cp
join public.feya_commerce_sellable_configurations sc using (sellable_configuration_id)
where sc.canonical_product_id='057fbd51-52f5-4404-b126-e5d75b8599f4' and sc.normalized_key='full_set_couple_owner_20260917';
