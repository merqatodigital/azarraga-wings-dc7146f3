
-- ============ roles ============
CREATE TYPE public.app_role AS ENUM ('admin','staff');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by staff" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- first user becomes admin, everyone gets staff
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ source documents / provenance ============
CREATE TABLE public.source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL DEFAULT 'unknown',
  reference text,
  filename text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  file_size bigint,
  customer_id uuid,
  project_id uuid,
  customer_name text,
  project_name text,
  location text,
  doc_date date,
  ingestion_status text NOT NULL DEFAULT 'PENDING',
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_information jsonb NOT NULL DEFAULT '[]'::jsonb,
  conflicts jsonb NOT NULL DEFAULT '[]'::jsonb,
  human_review_required boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ customers / contacts ============
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  billing_address text,
  project_address text,
  tin text,
  phone text,
  email text,
  notes text,
  source_document_id uuid REFERENCES public.source_documents(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  lead_id uuid,
  name text NOT NULL,
  role text,
  phone text,
  email text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ leads ============
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project text NOT NULL,
  location text NOT NULL DEFAULT 'Palawan',
  project_type text NOT NULL DEFAULT 'Unqualified',
  project_stage text,
  owner_name text,
  developer text,
  architect text,
  contractor text,
  source_url text,
  source_date date,
  relevance text,
  score integer NOT NULL DEFAULT 0,
  next_action text,
  status text NOT NULL DEFAULT 'DISCOVERED',
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  human_review_required boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ADD CONSTRAINT contacts_lead_fk FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- ============ projects ============
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  source_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  name text NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'ACTIVE',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.source_documents ADD CONSTRAINT source_documents_customer_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.source_documents ADD CONSTRAINT source_documents_project_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

-- ============ quotes ============
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text UNIQUE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT '',
  project_name text NOT NULL DEFAULT '',
  location text,
  quote_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'DRAFT',
  currency text NOT NULL DEFAULT 'PHP',
  discount_centavos bigint NOT NULL DEFAULT 0,
  crating_centavos bigint NOT NULL DEFAULT 0,
  shipping_centavos bigint NOT NULL DEFAULT 0,
  trucking_centavos bigint NOT NULL DEFAULT 0,
  delivery_centavos bigint NOT NULL DEFAULT 0,
  installation_centavos bigint NOT NULL DEFAULT 0,
  tax_rate_basis_points integer,
  tax_treatment text,
  subtotal_centavos bigint NOT NULL DEFAULT 0,
  tax_centavos bigint NOT NULL DEFAULT 0,
  total_centavos bigint NOT NULL DEFAULT 0,
  terms text,
  lead_time text,
  notes text,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quote_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  line_no integer NOT NULL DEFAULT 1,
  description text NOT NULL DEFAULT '',
  product_family text,
  system text,
  glass text,
  frame text,
  width_mm numeric,
  height_mm numeric,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'set',
  unit_price_centavos bigint NOT NULL DEFAULT 0,
  amount_centavos bigint NOT NULL DEFAULT 0,
  pricing_status text NOT NULL DEFAULT 'NEEDS_PRICE_REVIEW',
  evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.quote_lines(quote_id);

-- ============ purchase orders ============
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  po_date date,
  currency text NOT NULL DEFAULT 'PHP',
  total_centavos bigint NOT NULL DEFAULT 0,
  terms text,
  status text NOT NULL DEFAULT 'RECEIVED',
  comparison jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_document_id uuid REFERENCES public.source_documents(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  line_no integer NOT NULL DEFAULT 1,
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'set',
  unit_price_centavos bigint NOT NULL DEFAULT 0,
  amount_centavos bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.purchase_order_lines(purchase_order_id);

-- ============ invoices ============
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  po_reference text,
  customer_name text NOT NULL DEFAULT '',
  project_name text NOT NULL DEFAULT '',
  invoice_type text NOT NULL DEFAULT 'DOWN_PAYMENT',
  invoice_date date NOT NULL DEFAULT current_date,
  due_date date,
  status text NOT NULL DEFAULT 'DRAFT',
  currency text NOT NULL DEFAULT 'PHP',
  percentage_basis_points integer NOT NULL DEFAULT 10000,
  subtotal_centavos bigint NOT NULL DEFAULT 0,
  tax_centavos bigint NOT NULL DEFAULT 0,
  total_centavos bigint NOT NULL DEFAULT 0,
  paid_centavos bigint NOT NULL DEFAULT 0,
  balance_centavos bigint NOT NULL DEFAULT 0,
  terms text,
  notes text,
  human_approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  line_no integer NOT NULL DEFAULT 1,
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'set',
  unit_price_centavos bigint NOT NULL DEFAULT 0,
  amount_centavos bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.invoice_lines(invoice_id);

-- ============ payments ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount_centavos bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PHP',
  payment_date date NOT NULL DEFAULT current_date,
  method text,
  reference text,
  notes text,
  source_document_id uuid REFERENCES public.source_documents(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.payments(invoice_id);

-- ============ client documents ============
CREATE TABLE public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  source_document_id uuid REFERENCES public.source_documents(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'other',
  title text,
  bucket text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size bigint,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ items purchased ============
CREATE TABLE public.items_purchased (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  product_family text NOT NULL,
  system text,
  description text,
  glass text,
  frame_color text,
  width_mm numeric,
  height_mm numeric,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price_centavos bigint,
  currency text NOT NULL DEFAULT 'PHP',
  purchased_on date,
  source_reference text,
  source_document_id uuid REFERENCES public.source_documents(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ commercial memory (ICM) ============
CREATE TABLE public.commercial_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text,
  project_name text,
  location text,
  product_family text NOT NULL,
  system text,
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  glass jsonb NOT NULL DEFAULT '{}'::jsonb,
  frame_color text,
  width_mm numeric,
  height_mm numeric,
  quantity numeric,
  historical_unit_price_centavos bigint,
  historical_line_amount_centavos bigint,
  currency text NOT NULL DEFAULT 'PHP',
  included_services jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing_type text NOT NULL DEFAULT 'HISTORICAL_EVIDENCE',
  source_reference text NOT NULL,
  source_date date,
  source_document_id uuid REFERENCES public.source_documents(id) ON DELETE SET NULL,
  evidence_kind text NOT NULL DEFAULT 'FACT',
  confidence numeric NOT NULL DEFAULT 1,
  human_review_required boolean NOT NULL DEFAULT false,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.commercial_evidence(product_family);

-- ============ agent settings & fx ============
CREATE TABLE public.agent_settings (
  id integer PRIMARY KEY DEFAULT 1,
  provider text NOT NULL DEFAULT 'openrouter',
  model text NOT NULL DEFAULT '',
  free_models_only boolean NOT NULL DEFAULT true,
  temperature numeric NOT NULL DEFAULT 0.2,
  human_approval_required boolean NOT NULL DEFAULT true,
  base_currency text NOT NULL DEFAULT 'PHP',
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_settings_singleton CHECK (id = 1)
);
INSERT INTO public.agent_settings (id) VALUES (1);

CREATE TABLE public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base text NOT NULL DEFAULT 'PHP',
  quote text NOT NULL,
  rate numeric NOT NULL,
  source text NOT NULL,
  human_approved boolean NOT NULL DEFAULT false,
  effective_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ grants + RLS for all commercial tables ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'source_documents','customers','contacts','leads','projects','quotes','quote_lines',
    'purchase_orders','purchase_order_lines','invoices','invoice_lines','payments',
    'client_documents','items_purchased','commercial_evidence','agent_settings','exchange_rates'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "staff read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "staff insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "staff update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "admin delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.has_role(auth.uid(),''admin''))', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY[
    'source_documents','customers','contacts','leads','projects','quotes',
    'purchase_orders','invoices','commercial_evidence'
  ] LOOP
    EXECUTE format('CREATE TRIGGER t_%1$s_updated BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t);
  END LOOP;
END $$;

-- agent_settings: only admins may change
DROP POLICY "staff update agent_settings" ON public.agent_settings;
DROP POLICY "staff insert agent_settings" ON public.agent_settings;
CREATE POLICY "admin update agent_settings" ON public.agent_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ document number sequences ============
CREATE SEQUENCE public.quote_number_seq START 1;
CREATE SEQUENCE public.invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION public.next_quote_number() RETURNS text
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'Q' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.quote_number_seq')::text, 4, '0')
$$;
CREATE OR REPLACE FUNCTION public.next_invoice_number() RETURNS text
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'INV' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0')
$$;
GRANT EXECUTE ON FUNCTION public.next_quote_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated;

-- keep invoice paid/balance in sync with payments
CREATE OR REPLACE FUNCTION public.sync_invoice_balance() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv uuid; paid bigint; tot bigint;
BEGIN
  inv := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(amount_centavos),0) INTO paid FROM public.payments WHERE invoice_id = inv;
  SELECT total_centavos INTO tot FROM public.invoices WHERE id = inv;
  UPDATE public.invoices SET
    paid_centavos = paid,
    balance_centavos = GREATEST(0, COALESCE(tot,0) - paid),
    status = CASE
      WHEN status IN ('DRAFT','REVIEW','CANCELLED') THEN status
      WHEN paid <= 0 THEN 'ISSUED'
      WHEN paid < COALESCE(tot,0) THEN 'PARTIALLY_PAID'
      ELSE 'PAID' END
  WHERE id = inv;
  RETURN NULL;
END; $$;
CREATE TRIGGER t_payments_sync AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_balance();
