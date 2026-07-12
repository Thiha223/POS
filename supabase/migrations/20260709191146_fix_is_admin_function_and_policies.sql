/*
# Fix is_admin function and ensure policies work correctly

## Summary
1. Fix the is_admin() function - remove incorrect quotes from search_path
2. Recreate admin policies with explicit SECURITY DEFINER calls
*/

-- Fix the is_admin function (remove quotes from search_path)
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

-- For safety, let's also create a helper function that checks admin for any user_id
CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = check_user_id
      AND (role = 'admin' OR is_admin = true)
  );
$$;

-- Drop and recreate policies to ensure they use the fixed function

-- Products: Admin full access
DROP POLICY IF EXISTS "select_all_products_admin" ON public.products;
CREATE POLICY "select_all_products_admin"
  ON public.products FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "update_all_products_admin" ON public.products;
CREATE POLICY "update_all_products_admin"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_all_products_admin" ON public.products;
CREATE POLICY "delete_all_products_admin"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- Ensure INSERT policy also allows admin to insert for any user
DROP POLICY IF EXISTS "insert_own_products" ON public.products;
CREATE POLICY "insert_own_products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);
