-- Preserve Etsy raw imports; align only current draft material with owner choices.
BEGIN;
UPDATE public.feya_commerce_product_drafts
SET material='Vegan leather', updated_at=now()
WHERE canonical_product_id::text IN (
  'ff0996b6-f369-4313-baf5-2d465d9c06f2',
  'f0e73d70-cf3d-4557-8d59-142c78a106ac'
) AND material='Fabric, Leather, Faux leather, Latex';
UPDATE public.feya_commerce_product_drafts
SET material='Vegan leather', updated_at=now()
WHERE canonical_product_id='b68d0386-ed1f-4410-8001-185bf3aaf25f'
  AND material='Metal, Leather, Faux leather, Chrome, Lame & metallic';
UPDATE public.feya_commerce_product_drafts
SET material='Leather', updated_at=now()
WHERE canonical_product_id::text IN (
  '596c5ec2-e59e-484f-8f73-89221f2b4171',
  'b8ab6fa1-1af6-4c52-b6fb-5b766e6d99da'
) AND material='Leather, Faux leather';
COMMIT;
