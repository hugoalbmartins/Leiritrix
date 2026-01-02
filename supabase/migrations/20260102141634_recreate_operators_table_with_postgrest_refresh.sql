/*
  # Recreate Operators Table and Force PostgREST Refresh
  
  This migration ensures the operators table is properly visible to PostgREST
  by dropping and recreating it with all necessary permissions and policies.
*/

-- Drop existing table and recreate to force PostgREST to recognize it
DROP TABLE IF EXISTS operators CASCADE;

-- Recreate operators table
CREATE TABLE operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  commission_visible_to_bo boolean DEFAULT false NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  categories text[] DEFAULT '{}'::text[] CHECK (categories <@ ARRAY['energia_eletricidade'::text, 'energia_gas'::text, 'telecomunicacoes'::text, 'paineis_solares'::text])
);

-- Create indexes
CREATE INDEX idx_operators_active ON operators(active);
CREATE INDEX idx_operators_name ON operators(name);

-- Grant permissions
GRANT ALL ON operators TO postgres;
GRANT ALL ON operators TO authenticated;
GRANT ALL ON operators TO service_role;
GRANT SELECT ON operators TO anon;

-- Enable RLS
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "Admins can view all operators"
  ON operators FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert operators"
  ON operators FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update operators"
  ON operators FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete operators"
  ON operators FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Backoffice can view all operators"
  ON operators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'backoffice'
      AND users.active = true
    )
  );

-- Recreate trigger for updated_at
CREATE OR REPLACE FUNCTION update_operators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_operators_updated_at ON operators;
CREATE TRIGGER trigger_operators_updated_at
  BEFORE UPDATE ON operators
  FOR EACH ROW
  EXECUTE FUNCTION update_operators_updated_at();

-- Recreate foreign key constraints for dependent tables
ALTER TABLE sales 
  DROP CONSTRAINT IF EXISTS sales_operator_id_fkey,
  ADD CONSTRAINT sales_operator_id_fkey 
    FOREIGN KEY (operator_id) 
    REFERENCES operators(id) 
    ON DELETE SET NULL;

ALTER TABLE partner_operators
  DROP CONSTRAINT IF EXISTS partner_operators_operator_id_fkey,
  ADD CONSTRAINT partner_operators_operator_id_fkey
    FOREIGN KEY (operator_id)
    REFERENCES operators(id)
    ON DELETE CASCADE;

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
