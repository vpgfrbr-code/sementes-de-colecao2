-- Migration 043: Allow seed_count = 0 on product_variants
--
-- Bundle products use a single variant with seed_count = 0 (the actual seed
-- math comes from bundle_components). Migration 004 created the constraint
-- CHECK (seed_count > 0), which rejects bundle variants. We relax it to >= 0.
-- Standard products will continue to use seed_count >= 1 because the admin
-- UI defaults variants to 1 and validates accordingly.

ALTER TABLE product_variants
  DROP CONSTRAINT IF EXISTS product_variants_seed_count_check;

ALTER TABLE product_variants
  ADD CONSTRAINT product_variants_seed_count_check
  CHECK (seed_count >= 0);
