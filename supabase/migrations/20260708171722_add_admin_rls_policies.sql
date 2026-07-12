/*
# Add admin access RLS policies

## Summary
Adds RLS policies allowing admin users (role = 'admin' or is_admin = true) to
SELECT and UPDATE all profiles and subscription_requests. Non-admin users
retain their existing own-row-only access.

## Security
- Admin check uses a subquery on profiles to verify the requesting user has
  role = 'admin' or is_admin = true.
- No DELETE or INSERT policies are added for admins (not needed for this flow).
*/

-- Helper function: check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND (role = 'admin' OR is_admin = true)
  );
$$;

-- Profiles: admin can SELECT all rows
DROP POLICY IF EXISTS "select_all_profiles_admin" ON public.profiles;
CREATE POLICY "select_all_profiles_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- Profiles: admin can UPDATE all rows (to change subscription_plan on approval)
DROP POLICY IF EXISTS "update_all_profiles_admin" ON public.profiles;
CREATE POLICY "update_all_profiles_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

-- subscription_requests: admin can SELECT all rows
DROP POLICY IF EXISTS "select_all_sub_requests_admin" ON public.subscription_requests;
CREATE POLICY "select_all_sub_requests_admin"
  ON public.subscription_requests FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- subscription_requests: admin can UPDATE all rows (to approve/reject)
DROP POLICY IF EXISTS "update_all_sub_requests_admin" ON public.subscription_requests;
CREATE POLICY "update_all_sub_requests_admin"
  ON public.subscription_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);
