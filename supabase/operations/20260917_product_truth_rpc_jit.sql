-- Runtime logs showed repeated SQLSTATE 57014 on the canonical truth read.
-- Keep every evidence gate and the API statement timeout unchanged.
-- Scoped execution setting avoids compilation overhead for this short admin read.
-- Before: search_path=public. Rollback: ALTER FUNCTION ... RESET jit.
ALTER FUNCTION public.feya_commerce_get_seo_product_truth_v4(uuid) SET jit TO off;
-- Saved Preview also reads the exact storefront RPC; its slowest successful
-- PostgREST reads approached the 8s timeout (pg_stat_statements).
ALTER FUNCTION public.feya_commerce_get_step7_storefront_products_api_v7(uuid) SET jit TO off;
