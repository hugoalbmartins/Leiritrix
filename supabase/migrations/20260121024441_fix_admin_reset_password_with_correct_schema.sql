/*
  # Corrigir função de reset de password com schema correto

  1. Correção
    - Usar `extensions.crypt` e `extensions.gen_salt` em vez de versões sem schema
    - A extensão pgcrypto está no schema `extensions`
  
  2. Segurança
    - Mantém todas as verificações de segurança
    - Apenas admins podem executar
*/

-- Drop existing function
DROP FUNCTION IF EXISTS admin_reset_user_password(uuid, text);

-- Create function to reset user password (admin only) with correct schema references
CREATE OR REPLACE FUNCTION admin_reset_user_password(
  target_user_id uuid,
  new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  current_user_role text;
  target_user_email text;
BEGIN
  -- Check if current user is admin
  SELECT role INTO current_user_role
  FROM public.users
  WHERE id = auth.uid();
  
  IF current_user_role IS NULL OR current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Apenas administradores podem resetar passwords';
  END IF;
  
  -- Get target user email
  SELECT email INTO target_user_email
  FROM auth.users
  WHERE id = target_user_id;
  
  IF target_user_email IS NULL THEN
    RAISE EXCEPTION 'Utilizador não encontrado';
  END IF;
  
  -- Update password in auth.users using extensions schema
  UPDATE auth.users
  SET 
    encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Mark user must change password
  UPDATE public.users
  SET must_change_password = true
  WHERE id = target_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Password resetada com sucesso'
  );
END;
$$;

-- Grant execute permission to authenticated users (the function will check if admin internally)
GRANT EXECUTE ON FUNCTION admin_reset_user_password(uuid, text) TO authenticated;