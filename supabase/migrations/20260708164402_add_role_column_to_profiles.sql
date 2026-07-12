/*
# Add role column to profiles for RBAC

## Summary
Adds a `role` column to the `profiles` table to support Role-Based Access Control.
The role distinguishes between regular users and admins. This complements the
existing `is_admin` boolean flag, providing a cleaner enum-based role field.

## New Columns
### profiles.role
- text, NOT NULL, DEFAULT 'user'
- CHECK constraint: role IN ('admin', 'user')
- Backfilled from is_admin: any profile with is_admin=true gets role='admin'.

## Notes
1. The `is_admin` boolean is kept for backward compatibility with existing code.
2. A trigger keeps `role` and `is_admin` in sync: setting is_admin=true sets role='admin',
   and setting role='admin' sets is_admin=true.
3. Existing admin profiles are backfilled on migration.
*/

-- Add role column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('admin', 'user'));

-- Backfill: any existing admin profiles get role='admin'
UPDATE public.profiles SET role = 'admin' WHERE is_admin = true;

-- Keep role and is_admin in sync going forward
CREATE OR REPLACE FUNCTION public.sync_role_and_is_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If is_admin was changed, sync role
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF NEW.is_admin = true THEN
      NEW.role := 'admin';
    ELSE
      NEW.role := 'user';
    END IF;
  END IF;
  -- If role was changed, sync is_admin
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NEW.role = 'admin' THEN
      NEW.is_admin := true;
    ELSE
      NEW.is_admin := false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_role_is_admin ON public.profiles;
CREATE TRIGGER trg_sync_role_is_admin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_role_and_is_admin();

-- Index for admin lookups by role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role) WHERE role = 'admin';
