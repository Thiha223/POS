/*
# Add admin RPC functions for user email management

## Summary
1. `admin_get_user_email(target_user_id uuid)` — SECURITY DEFINER function that
   returns the email from `auth.users` for a given user ID. Allows admins to
   see the real auth email since it is not stored in `profiles`.
2. `admin_update_user_email(target_user_id uuid, new_email text)` — SECURITY
   DEFINER function that updates the email in `auth.users` using the internal
   `auth.users` table. Only callable by admins (checked via `public.is_admin()`).

## Security
- Both functions are SECURITY DEFINER with `search_path = public, auth`.
- `admin_update_user_email` checks `public.is_admin()` first and raises an
  exception if the caller is not an admin.
- `admin_get_user_email` also checks `public.is_admin()` to prevent non-admins
  from enumerating user emails.
*/

CREATE OR REPLACE FUNCTION public.admin_get_user_email(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_is_admin boolean;
  user_email text;
BEGIN
  SELECT public.is_admin() INTO caller_is_admin;
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;
  RETURN COALESCE(user_email, '');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_user_email(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_user_email(target_user_id uuid, new_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  SELECT public.is_admin() INTO caller_is_admin;
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  IF new_email IS NULL OR trim(new_email) = '' THEN
    RAISE EXCEPTION 'Email cannot be empty';
  END IF;

  UPDATE auth.users
  SET email = trim(new_email),
      email_change = now(),
      updated_at = now()
  WHERE id = target_user_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_email(uuid, text) TO authenticated;
