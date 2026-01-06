/*
  # Adicionar campo de data de venda

  1. Alterações
    - Adiciona coluna `sale_date` (date) à tabela `sales`
    - Define o valor padrão como a data atual (CURRENT_DATE)
    - Para registos existentes, popula com a data de `created_at`
    - Adiciona constraint check para garantir que a data não é futura
  
  2. Regras
    - Campo obrigatório (NOT NULL)
    - Não pode ser data futura
    - Por defeito usa a data atual
    - Usado para contabilização de comissões e relatórios mensais
*/

-- Adiciona a coluna sale_date com valor padrão
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS sale_date date DEFAULT CURRENT_DATE NOT NULL;

-- Popula com a data de created_at para vendas existentes (apenas a data, sem hora)
UPDATE sales 
SET sale_date = DATE(created_at) 
WHERE sale_date IS NULL OR sale_date = CURRENT_DATE;

-- Adiciona constraint para não permitir datas futuras
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sales_sale_date_not_future'
  ) THEN
    ALTER TABLE sales 
    ADD CONSTRAINT sales_sale_date_not_future 
    CHECK (sale_date <= CURRENT_DATE);
  END IF;
END $$;