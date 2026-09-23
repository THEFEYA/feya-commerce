-- Align current drafts with saved owner material/color choices; retain raw imports.
BEGIN;
UPDATE public.feya_commerce_product_drafts
SET material='Vegan leather', updated_at=now()
WHERE canonical_product_id='bc59df1d-edd3-4e63-9393-175c28d9be2b'
  AND material='Faux leather, Plastic, Fabric, Leather';
UPDATE public.feya_commerce_product_drafts
SET material='Vegan leather', updated_at=now()
WHERE canonical_product_id='ffbf1db6-6fae-4606-afbe-013415d6421d'
  AND material='Fabric, Leather, Faux leather, Latex, Lame & metallic';
UPDATE public.feya_commerce_product_drafts
SET color='Gold', updated_at=now()
WHERE canonical_product_id='32b51b28-0570-49af-90f5-7bfdd7da5148'
  AND color IS NULL;
COMMIT;
