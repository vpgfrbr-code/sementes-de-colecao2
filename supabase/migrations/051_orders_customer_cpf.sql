-- Migration 051: Capture customer CPF at order time
--
-- Stores the customer's CPF (Brazilian individual taxpayer registry number)
-- provided at checkout. The column is nullable so historical orders remain
-- valid. The CHECK constraint enforces the formatted mask (000.000.000-00);
-- digit verification is handled at the application layer.
--
-- CPF is sensitive PII — already redacted by src/lib/log.ts via CPF_RE
-- before any server log is written.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_cpf TEXT;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_customer_cpf_format_chk;
ALTER TABLE orders
  ADD CONSTRAINT orders_customer_cpf_format_chk CHECK (
    customer_cpf IS NULL
    OR customer_cpf ~ '^\d{3}\.\d{3}\.\d{3}-\d{2}$'
  );

COMMENT ON COLUMN orders.customer_cpf IS
  'Customer CPF in formatted form (000.000.000-00), collected at checkout. '
  'NULL for orders placed before this migration. Treated as PII.';
