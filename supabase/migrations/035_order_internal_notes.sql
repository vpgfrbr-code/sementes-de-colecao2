-- ═══════════════════════════════════════════════════════════════════════
-- 035 — Internal order notes (admin-only)
--
-- Adds a free-text internal_notes column to orders for admin annotations
-- (VIP, fraud flags, special handling, etc.). Not exposed to customers.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;
