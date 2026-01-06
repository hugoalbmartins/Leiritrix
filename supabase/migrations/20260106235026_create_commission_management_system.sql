/*
  # Sistema de Gestão de Comissões por Operadora

  1. Novas Tabelas
    - `operator_commission_settings`
      - Configurações gerais de comissões por operadora/parceiro
      - Define se comissão é manual ou automática
      - Define tipos de venda permitidos
      - Define se há diferenciação por tipo de NIF
    
    - `operator_commission_rules`
      - Regras específicas de cálculo de comissão
      - Define método de cálculo (fixo ou múltiplo de mensalidade)
      - Define se depende do período de fidelização
      - Valores específicos para cada combinação de parâmetros
  
  2. Alterações na Tabela Sales
    - Atualiza sale_type para incluir novos tipos
    - Adiciona campos para mensalidades anteriores/novas (up-sell/cross-sell)
    - Mantém retrocompatibilidade

  3. Segurança
    - RLS habilitado em todas as tabelas
    - Apenas admins podem modificar configurações
    - Todos podem ler (necessário para cálculos)
*/

-- Tabela de configurações de comissões por operadora/parceiro
CREATE TABLE IF NOT EXISTS operator_commission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  commission_type text NOT NULL DEFAULT 'manual' CHECK (commission_type IN ('manual', 'automatic')),
  nif_differentiation boolean NOT NULL DEFAULT false,
  allowed_sale_types text[] NOT NULL DEFAULT ARRAY['NI', 'MC', 'Refid']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(operator_id, partner_id)
);

-- Tabela de regras de comissão
CREATE TABLE IF NOT EXISTS operator_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_id uuid NOT NULL REFERENCES operator_commission_settings(id) ON DELETE CASCADE,
  sale_type text NOT NULL CHECK (sale_type IN ('NI', 'MC', 'Refid', 'Refid_Acrescimo', 'Refid_Decrescimo', 'Up_sell', 'Cross_sell')),
  nif_type text NOT NULL DEFAULT 'all' CHECK (nif_type IN ('5xx', '123xxx', 'all')),
  calculation_method text NOT NULL CHECK (calculation_method IN ('fixed_per_quantity', 'monthly_multiple')),
  depends_on_loyalty boolean NOT NULL DEFAULT false,
  loyalty_months integer CHECK (loyalty_months IN (0, 12, 24, 36) OR loyalty_months IS NULL),
  fixed_value numeric(10,2) DEFAULT 0,
  monthly_multiplier numeric(10,2) DEFAULT 0,
  applies_to_seller boolean NOT NULL DEFAULT true,
  applies_to_partner boolean NOT NULL DEFAULT true,
  seller_fixed_value numeric(10,2) DEFAULT 0,
  seller_monthly_multiplier numeric(10,2) DEFAULT 0,
  partner_fixed_value numeric(10,2) DEFAULT 0,
  partner_monthly_multiplier numeric(10,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Adicionar novos campos à tabela sales
DO $$
BEGIN
  -- Campo para mensalidade anterior (up-sell/cross-sell)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'previous_monthly_value'
  ) THEN
    ALTER TABLE sales ADD COLUMN previous_monthly_value numeric(10,2) DEFAULT 0;
  END IF;

  -- Campo para nova mensalidade (up-sell/cross-sell)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'new_monthly_value'
  ) THEN
    ALTER TABLE sales ADD COLUMN new_monthly_value numeric(10,2) DEFAULT 0;
  END IF;

  -- Campo para fidelização customizada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sales' AND column_name = 'custom_loyalty_months'
  ) THEN
    ALTER TABLE sales ADD COLUMN custom_loyalty_months integer;
  END IF;
END $$;

-- Atualizar constraint do sale_type para incluir novos tipos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sales_sale_type_check'
  ) THEN
    ALTER TABLE sales DROP CONSTRAINT sales_sale_type_check;
  END IF;
  
  ALTER TABLE sales ADD CONSTRAINT sales_sale_type_check 
  CHECK (sale_type IS NULL OR sale_type IN (
    'nova_instalacao', 'mudanca_casa', 'refid',
    'NI', 'MC', 'Refid', 'Refid_Acrescimo', 'Refid_Decrescimo', 'Up_sell', 'Cross_sell'
  ));
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_commission_settings_operator ON operator_commission_settings(operator_id);
CREATE INDEX IF NOT EXISTS idx_commission_settings_partner ON operator_commission_settings(partner_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_setting ON operator_commission_rules(setting_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_sale_type ON operator_commission_rules(sale_type);

-- Habilitar RLS
ALTER TABLE operator_commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_commission_rules ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para operator_commission_settings
CREATE POLICY "Todos podem ler configurações de comissão"
  ON operator_commission_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas admins podem inserir configurações de comissão"
  ON operator_commission_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.active = true
    )
  );

CREATE POLICY "Apenas admins podem atualizar configurações de comissão"
  ON operator_commission_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.active = true
    )
  );

CREATE POLICY "Apenas admins podem deletar configurações de comissão"
  ON operator_commission_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.active = true
    )
  );

-- Políticas RLS para operator_commission_rules
CREATE POLICY "Todos podem ler regras de comissão"
  ON operator_commission_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas admins podem inserir regras de comissão"
  ON operator_commission_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.active = true
    )
  );

CREATE POLICY "Apenas admins podem atualizar regras de comissão"
  ON operator_commission_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.active = true
    )
  );

CREATE POLICY "Apenas admins podem deletar regras de comissão"
  ON operator_commission_rules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.active = true
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_commission_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_commission_settings_timestamp
  BEFORE UPDATE ON operator_commission_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_settings_updated_at();

CREATE TRIGGER update_commission_rules_timestamp
  BEFORE UPDATE ON operator_commission_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_settings_updated_at();