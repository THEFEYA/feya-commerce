-- Owner-selected materials, verified 2026-09-17; raw Etsy evidence remains untouched.
BEGIN;
UPDATE public.feya_commerce_product_drafts SET material='Vegan leather', updated_at=now() WHERE canonical_product_id='cb31d61b-027c-4c47-b7ba-bf16283ada9c' AND material IN ('Leather, Faux leather, Latex','Vegan leather');
UPDATE public.feya_commerce_product_drafts SET material='Vegan leather', updated_at=now() WHERE canonical_product_id='b3910e41-9de7-483f-8d88-5783e8d90607' AND material IN ('Fabric, Leather, Faux leather, Latex','Vegan leather');
UPDATE public.feya_commerce_product_drafts SET material='Fabric and acrylic (plastic)', updated_at=now() WHERE canonical_product_id='0e75d2f2-c345-440e-88e4-333b63caed09' AND material IN ('Vegan Leather, Mirror Plastic','Fabric and acrylic (plastic)');
COMMIT;
SELECT canonical_product_id,material FROM public.feya_commerce_product_drafts WHERE canonical_product_id::text IN ('cb31d61b-027c-4c47-b7ba-bf16283ada9c','b3910e41-9de7-483f-8d88-5783e8d90607','0e75d2f2-c345-440e-88e4-333b63caed09');
