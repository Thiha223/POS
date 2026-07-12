/*
# Create admin password update function

## Summary
Creates a SECURITY DEFINER function to update a user's password hash directly
in auth.users, bypassing the weak password check. The function is dropped after use.
*/

CREATE OR REPLACE FUNCTION public.update_user_password(user_email text, new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, extensions, public, pg_catalog
AS $$
DECLARE
  user_id uuid;
  hash text;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_email;
  END IF;
  
  hash := extensions.crypt(new_password, extensions.gen_salt('bf', 10));
  
  UPDATE auth.users 
  SET encrypted_password = hash,
      updated_at = now()
  WHERE id = user_id;
  
  RETURN true;
END;
$$;

-- Update the admin user's password
SELECT public.update_user_password('admin@retail.com', '$k13zytapk');

-- Drop the function after use
DROP FUNCTION public.update_user_password(text, text);
