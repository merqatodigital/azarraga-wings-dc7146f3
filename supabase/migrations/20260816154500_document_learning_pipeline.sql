-- TALA document-learning pipeline: preserve every field from uploaded commercial documents.
-- Run through Supabase SQL Editor only after David reviews/approves.

ALTER TABLE public.source_documents
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS mrs_number text,
  ADD COLUMN IF NOT EXISTS expected_date date,
  ADD COLUMN IF NOT EXISTS payment_terms_raw text,
  ADD COLUMN IF NOT EXISTS memo text,
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS supplier_address text,
  ADD COLUMN IF NOT EXISTS supplier_contact_person text,
  ADD COLUMN IF NOT EXISTS supplier_phone text,
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS buyer_address text,
  ADD COLUMN IF NOT EXISTS buyer_tin text,
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS extraction_version text,
  ADD COLUMN IF NOT EXISTS learned_at timestamptz;

ALTER TABLE public.purchase_order_lines
  ADD COLUMN IF NOT EXISTS opening_code text,
  ADD COLUMN IF NOT EXISTS product_family text,
  ADD COLUMN IF NOT EXISTS system text,
  ADD COLUMN IF NOT EXISTS configuration text,
  ADD COLUMN IF NOT EXISTS glass_thickness_mm numeric,
  ADD COLUMN IF NOT EXISTS glass_type text,
  ADD COLUMN IF NOT EXISTS glass_color text,
  ADD COLUMN IF NOT EXISTS frame_color text,
  ADD COLUMN IF NOT EXISTS width_mm numeric,
  ADD COLUMN IF NOT EXISTS height_mm numeric,
  ADD COLUMN IF NOT EXISTS hardware jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS class text,
  ADD COLUMN IF NOT EXISTS vat_centavos bigint,
  ADD COLUMN IF NOT EXISTS raw_description text,
  ADD COLUMN IF NOT EXISTS raw_dimensions text,
  ADD COLUMN IF NOT EXISTS source_document_id uuid REFERENCES public.source_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confidence numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS human_review_required boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS purchase_order_lines_source_document_idx ON public.purchase_order_lines(source_document_id);
CREATE INDEX IF NOT EXISTS purchase_order_lines_opening_code_idx ON public.purchase_order_lines(opening_code);

CREATE TABLE IF NOT EXISTS public.document_financial_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id uuid NOT NULL REFERENCES public.source_documents(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  line_no integer,
  adjustment_type text NOT NULL,
  description text NOT NULL,
  amount_centavos bigint NOT NULL,
  currency text NOT NULL DEFAULT 'PHP',
  raw_text text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_financial_adjustments TO authenticated;
GRANT ALL ON public.document_financial_adjustments TO service_role;
ALTER TABLE public.document_financial_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff read document_financial_adjustments" ON public.document_financial_adjustments;
DROP POLICY IF EXISTS "staff insert document_financial_adjustments" ON public.document_financial_adjustments;
DROP POLICY IF EXISTS "staff update document_financial_adjustments" ON public.document_financial_adjustments;
DROP POLICY IF EXISTS "admin delete document_financial_adjustments" ON public.document_financial_adjustments;
CREATE POLICY "staff read document_financial_adjustments" ON public.document_financial_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff insert document_financial_adjustments" ON public.document_financial_adjustments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "staff update document_financial_adjustments" ON public.document_financial_adjustments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin delete document_financial_adjustments" ON public.document_financial_adjustments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
