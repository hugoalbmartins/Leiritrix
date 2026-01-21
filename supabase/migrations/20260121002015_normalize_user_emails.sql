/*
  # Normalize User Emails

  1. Changes
    - Create a trigger function that normalizes email to lowercase on insert/update
    - Apply the trigger to the users table
    - Update existing emails to lowercase

  2. Purpose
    - Prevent login issues caused by case-sensitive email mismatches
    - Ensure consistency between auth.users and public.users tables
*/

-- Function to normalize email to lowercase
CREATE OR REPLACE FUNCTION normalize_user_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email = LOWER(TRIM(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on users table
DROP TRIGGER IF EXISTS normalize_email_trigger ON users;
CREATE TRIGGER normalize_email_trigger
  BEFORE INSERT OR UPDATE OF email ON users
  FOR EACH ROW
  EXECUTE FUNCTION normalize_user_email();

-- Normalize existing emails
UPDATE users SET email = LOWER(TRIM(email)) WHERE email != LOWER(TRIM(email));
