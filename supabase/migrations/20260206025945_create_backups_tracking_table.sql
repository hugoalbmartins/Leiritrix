/*
  # Create backups tracking table

  1. New Tables
    - `backups`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - who performed the backup
      - `user_name` (text) - cached user name for display
      - `total_sales` (integer) - number of sales exported
      - `file_name` (text) - name of the exported file
      - `created_at` (timestamptz) - when the backup was done

  2. Security
    - Enable RLS on `backups` table
    - All authenticated users can view backups (to check if backup was done recently)
    - All authenticated users can insert backups (any user can do backup)
*/

CREATE TABLE IF NOT EXISTS backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  user_name text NOT NULL DEFAULT '',
  total_sales integer NOT NULL DEFAULT 0,
  file_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all backups"
  ON backups
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create backups"
  ON backups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at);
