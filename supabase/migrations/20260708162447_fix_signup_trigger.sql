/*
# Fix "Database error saving new user" on signup

## Root Cause
The trigger `trg_create_profile` on `auth.users` was failing silently and rolling back the
entire signup transaction in GoTrue, causing the 500 "Database error saving new user" error.

Two specific issues:
1. The SECURITY DEFINER function had no explicit `SET search_path = public`, so in some
   Supabase configurations it could not resolve the `profiles` table.
2. Any unhandled exception inside an AFTER trigger on auth.users propagates back to GoTrue
   and aborts the user creation entirely.

## Changes

### Modified: `create_profile_on_signup` function
- Added `SET search_path = public` so the function always finds the correct schema.
- Wrapped the INSERT in a BEGIN/EXCEPTION block so any error is swallowed;
  the trigger always returns NEW, never blocks user creation.
- Qualified `profiles` with `public.` explicitly.

### Modified: `profiles.user_id` column
- Removed `DEFAULT auth.uid()` from the `user_id` column.
  The trigger always supplies the value explicitly as `NEW.id`, so the DEFAULT is never
  used server-side. Keeping it caused `auth.uid()` to be compiled into the column expression,
  which evaluates in the trigger context where no JWT is present and can cause subtle errors
  in some Postgres/Supabase versions.
  The frontend always provides `user_id` explicitly via upsert, so removing the DEFAULT is safe.
*/

-- 1. Fix the trigger function: add search_path + exception handler
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, shop_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'shop_name', 'My Shop')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but never block user creation
    RAISE WARNING 'create_profile_on_signup failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Remove the auth.uid() DEFAULT from user_id — it's never needed (trigger always
--    supplies the value, and the frontend always passes user_id explicitly on upsert)
ALTER TABLE public.profiles
  ALTER COLUMN user_id DROP DEFAULT;
