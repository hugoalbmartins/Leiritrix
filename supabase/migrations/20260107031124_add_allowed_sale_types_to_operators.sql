/*
  # Add allowed_sale_types to operators table

  1. Changes
    - Add `allowed_sale_types` column to `operators` table
      - Type: text array (text[])
      - Stores which sale types are allowed for this operator
      - Default: empty array (all types allowed if empty)
      - Example values: ['NI', 'MC', 'Refid', 'Up_sell', 'Cross_sell']
    
  2. Notes
    - Empty array means all sale types are allowed
    - This will be used to filter sale types in the commission wizard
    - Will also filter available sale types when creating/editing sales
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'operators' AND column_name = 'allowed_sale_types'
  ) THEN
    ALTER TABLE operators ADD COLUMN allowed_sale_types text[] DEFAULT '{}';
  END IF;
END $$;