-- Operational disable for C4.3-C quote receipt creation. Preserve immutable offer/quote history.
begin;
revoke execute on function public.feya_commerce_create_quote_v1(jsonb) from service_role;
revoke insert on public.feya_commerce_quote_receipts_v1 from service_role;
commit;
notify pgrst,'reload schema';
