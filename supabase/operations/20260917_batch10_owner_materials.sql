-- Batch10: all five owner decisions explicitly select vegan leather.
-- The first four imports mixed fabric/latex/natural leather; photos show
-- the sold coated pieces over separate styled clothing. Keep raw imports.
BEGIN;
UPDATE public.feya_commerce_product_drafts
SET material='Vegan leather', updated_at=now()
WHERE canonical_product_id::text IN (
  'b7003343-6537-437d-9dab-cdf902d37b7e',
  'f96bb86c-43aa-49c1-a718-41fbe050a1ac',
  '82d2dc58-e635-4bc1-8571-2587641e627f',
  '6a885710-fbee-4790-ba09-d56530f641f6'
) AND material IN ('Fabric, Leather, Faux leather, Latex', 'Faux leather, Fabric, Leather, Latex', 'Vegan leather');
COMMIT;
