-- Batch11: preserve raw imports. Current owner choices specify vegan leather
-- on the sold coated pieces; legacy imports also named latex/natural leather.
-- The first product has source-backed, photograph-visible feather trim.
-- Its trim is retained; its origin is unknown, so do not call the entire outfit vegan.
BEGIN;
UPDATE public.feya_commerce_product_drafts
SET material='Vegan leather, feather trim', updated_at=now()
WHERE canonical_product_id='6a4c1f02-8f02-4aca-b70d-8d9ac66b9b40'
  AND material='vegan leather, featers';
UPDATE public.feya_commerce_product_drafts
SET material='Vegan leather', updated_at=now()
WHERE canonical_product_id::text IN (
  '51a30d6f-a588-49b9-b077-5f33488efd36',
  '51d879ce-f762-4307-b896-efcb2ffd64e9',
  'b28d72d8-330b-400f-b595-124edc3f78f3',
  '84cb55e1-a5a8-473c-abcd-17f0dc4161ab'
) AND material='Fabric, Leather, Faux leather, Latex';
COMMIT;
