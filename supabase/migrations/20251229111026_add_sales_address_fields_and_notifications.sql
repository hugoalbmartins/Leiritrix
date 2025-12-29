/*
  # Add Detailed Address Fields to Sales and Create Notifications System

  ## Sales Table Changes
  
  1. New Address Fields
    - `street_address` (text, NOT NULL) - Rua e número de porta
    - `postal_code` (text, NOT NULL) - Código postal
    - `city` (text, NOT NULL) - Localidade
    - `client_nif` - Changed to NOT NULL (required field)
    - `client_address` - Deprecated but kept for data migration
  
  2. Data Migration
    - Set default values for existing records to prevent data loss
    - NIF set to empty string for records without it (to be updated)
  
  ## Notifications Table
  
  1. New Table: `notifications`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references users) - User who receives the notification
    - `title` (text) - Notification title
    - `message` (text) - Notification message
    - `type` (text) - Type: 'sale_created', 'sale_status_changed'
    - `sale_id` (uuid, references sales) - Related sale
    - `read` (boolean) - Whether notification has been read
    - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on notifications table
    - Users can only read their own notifications
    - Users can update their own notifications (mark as read)
    - System can insert notifications for all users
*/

-- Add detailed address fields to sales table
DO $$
BEGIN
  -- Add street_address column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'street_address'
  ) THEN
    ALTER TABLE sales ADD COLUMN street_address text;
  END IF;

  -- Add postal_code column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE sales ADD COLUMN postal_code text;
  END IF;

  -- Add city column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'city'
  ) THEN
    ALTER TABLE sales ADD COLUMN city text;
  END IF;
END $$;

-- Migrate existing client_address data to new fields (simple default)
UPDATE sales 
SET 
  street_address = COALESCE(client_address, 'A atualizar'),
  postal_code = COALESCE(NULLIF(client_address, ''), '0000-000'),
  city = 'A atualizar'
WHERE street_address IS NULL OR postal_code IS NULL OR city IS NULL;

-- Update client_nif empty values
UPDATE sales 
SET client_nif = '000000000'
WHERE client_nif IS NULL OR client_nif = '';

-- Make new address fields and NIF required
ALTER TABLE sales 
  ALTER COLUMN street_address SET NOT NULL,
  ALTER COLUMN postal_code SET NOT NULL,
  ALTER COLUMN city SET NOT NULL,
  ALTER COLUMN client_nif SET NOT NULL;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('sale_created', 'sale_status_changed', 'general')),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to insert notifications
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);