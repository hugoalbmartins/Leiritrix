/*
  # Adicionar opção "Novo" ao Encarteiramento

  1. Alterações
    - Atualiza constraint do campo `portfolio_status` na tabela `sales`
      para incluir 'novo' além de 'cliente_carteira' e 'fora_carteira'
    - Atualiza constraint do campo `portfolio_filter` na tabela `operator_commission_rules`
      para incluir 'novo' nas opções de filtro

  2. Notas
    - Agora existem 3 tipos de encarteiramento: Novo, Cliente de Carteira, Fora de Carteira
    - Aplicável apenas a clientes empresariais
*/

-- Remover constraint antiga e adicionar nova para sales.portfolio_status
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'sales' AND column_name = 'portfolio_status'
  ) THEN
    ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_portfolio_status_check;
  END IF;

  -- Add new constraint with 'novo' option
  ALTER TABLE sales ADD CONSTRAINT sales_portfolio_status_check 
    CHECK (portfolio_status IN ('novo', 'cliente_carteira', 'fora_carteira') OR portfolio_status IS NULL);
END $$;

-- Remover constraint antiga e adicionar nova para operator_commission_rules.portfolio_filter
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'operator_commission_rules' AND column_name = 'portfolio_filter'
  ) THEN
    ALTER TABLE operator_commission_rules DROP CONSTRAINT IF EXISTS operator_commission_rules_portfolio_filter_check;
  END IF;

  -- Add new constraint with 'novo' option
  ALTER TABLE operator_commission_rules ADD CONSTRAINT operator_commission_rules_portfolio_filter_check 
    CHECK (portfolio_filter IN ('novo', 'cliente_carteira', 'fora_carteira', 'all'));
END $$;