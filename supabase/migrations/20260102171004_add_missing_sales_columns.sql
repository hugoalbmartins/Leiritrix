/*
  # Add Missing Sales Columns

  1. Changes to `sales` table
    - Add `sale_type` (text, nullable) - Type of sale: new installation or refid
    - Add `energy_type` (text, nullable) - For energy sales: electricity, gas, or dual
    - Add `cpe` (text, nullable) - CPE code for electricity
    - Add `potencia` (text, nullable) - Power rating in kVA
    - Add `cui` (text, nullable) - CUI code for gas
    - Add `escalao` (text, nullable) - Gas tier/level
    - Add `loyalty_months` (integer, default 0) - Contract loyalty period in months

  2. Notes
    - All new columns are nullable to support existing records
    - sale_type can be 'nova_instalacao' or 'refid'
    - energy_type can be 'eletricidade', 'gas', or 'dual'
*/

-- Add sale_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'sale_type'
  ) THEN
    ALTER TABLE sales ADD COLUMN sale_type text;
  END IF;
END $$;

-- Add energy_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'energy_type'
  ) THEN
    ALTER TABLE sales ADD COLUMN energy_type text;
  END IF;
END $$;

-- Add cpe column (electricity)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'cpe'
  ) THEN
    ALTER TABLE sales ADD COLUMN cpe text;
  END IF;
END $$;

-- Add potencia column (electricity)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'potencia'
  ) THEN
    ALTER TABLE sales ADD COLUMN potencia text;
  END IF;
END $$;

-- Add cui column (gas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'cui'
  ) THEN
    ALTER TABLE sales ADD COLUMN cui text;
  END IF;
END $$;

-- Add escalao column (gas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'escalao'
  ) THEN
    ALTER TABLE sales ADD COLUMN escalao text;
  END IF;
END $$;

-- Add loyalty_months column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'loyalty_months'
  ) THEN
    ALTER TABLE sales ADD COLUMN loyalty_months integer DEFAULT 0;
  END IF;
END $$;
