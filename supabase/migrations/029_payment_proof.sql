-- Add payment proof columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_proof_path TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMPTZ;

-- Create private storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS on storage.objects: only service_role can access (enforced by default for private buckets)
-- No public policies needed — all access goes through API routes with service_role key
