-- Existing functions may retain explicit EXECUTE grants to Supabase API roles
-- after revoking PUBLIC. These Product Truth helpers are intentionally
-- service-only because they are SECURITY DEFINER functions over internal SEO
-- projections.
revoke all on function public.feya_commerce_get_seo_product_truth_v1(uuid) from public, anon, authenticated;
revoke all on function public.feya_commerce_get_seo_product_truth_v3(uuid) from public, anon, authenticated;
revoke all on function public.feya_commerce_get_seo_product_truth_v4(uuid) from public, anon, authenticated;

grant execute on function public.feya_commerce_get_seo_product_truth_v1(uuid) to service_role;
grant execute on function public.feya_commerce_get_seo_product_truth_v3(uuid) to service_role;
grant execute on function public.feya_commerce_get_seo_product_truth_v4(uuid) to service_role;
