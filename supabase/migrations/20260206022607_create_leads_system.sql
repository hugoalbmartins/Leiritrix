/*
  # Create Leads Management System

  1. New Tables
    - `leads`
      - `id` (uuid, primary key)
      - `client_name` (text, required)
      - `client_email` (text, optional)
      - `client_phone` (text, optional)
      - `client_nif` (text, optional)
      - `street_address` (text, optional)
      - `postal_code` (text, optional)
      - `city` (text, optional)
      - `category` (text: energia, telecomunicacoes, paineis_solares)
      - `source` (text: telefone, email, presencial, website, referencia, outro)
      - `status` (text: nova, em_contacto, qualificada, convertida, perdida)
      - `priority` (text: baixa, media, alta)
      - `notes` (text, optional)
      - `next_contact_date` (date, optional) - for follow-up alerts
      - `assigned_to` (uuid FK to users, optional)
      - `partner_id` (uuid FK to partners, optional)
      - `operator_id` (uuid FK to operators, optional)
      - `converted_sale_id` (uuid FK to sales, optional) - links to sale when converted
      - `created_by` (uuid FK to users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `leads` table
    - Policies for authenticated users based on role
*/

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  client_nif text,
  street_address text,
  postal_code text,
  city text,
  category text NOT NULL CHECK (category = ANY (ARRAY['energia'::text, 'telecomunicacoes'::text, 'paineis_solares'::text])),
  source text NOT NULL DEFAULT 'outro' CHECK (source = ANY (ARRAY['telefone'::text, 'email'::text, 'presencial'::text, 'website'::text, 'referencia'::text, 'outro'::text])),
  status text NOT NULL DEFAULT 'nova' CHECK (status = ANY (ARRAY['nova'::text, 'em_contacto'::text, 'qualificada'::text, 'convertida'::text, 'perdida'::text])),
  priority text NOT NULL DEFAULT 'media' CHECK (priority = ANY (ARRAY['baixa'::text, 'media'::text, 'alta'::text])),
  notes text,
  next_contact_date date,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES partners(id) ON DELETE SET NULL,
  operator_id uuid REFERENCES operators(id) ON DELETE SET NULL,
  converted_sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Backoffice can view all leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'backoffice'
    )
  );

CREATE POLICY "Backoffice can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'backoffice'
    )
  );

CREATE POLICY "Backoffice can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'backoffice'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'backoffice'
    )
  );

CREATE POLICY "Backoffice can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'backoffice'
    )
  );

CREATE POLICY "Sellers can view assigned leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "Sellers can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

CREATE POLICY "Sellers can update assigned leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_next_contact_date ON leads(next_contact_date);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
