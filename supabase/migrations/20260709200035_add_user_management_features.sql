/*
# Add User Management Features for Admin Dashboard

## Summary
This migration adds user management features for the admin dashboard:
1. Adds status column to profiles (active/inactive) for suspension
2. Creates customers table to track end-customers
3. Updates RLS policies to grant admin full access to these tables
4. Creates an admin_delete_user function for safe cascade deletion

## New Tables

### customers
- Stores end-customer information (name, phone, email, total_orders, total_spent)
- Each customer belongs to a shop owner (user_id)
- Indexes on user_id and phone for efficient lookups

## Modified Tables

### profiles
- Added `status` column (text, default 'active') with CHECK constraint
- Status can be 'active' or 'inactive'
- Inactive users cannot log in (enforced at application level)

## Security
- RLS policies updated to grant admin full access to customers table
- Admin can manage all customers regardless of ownership
- Admin can update user status and delete users

## Functions

### admin_delete_user(target_user_id uuid)
- SECURITY DEFINER function that deletes a user and all related data
- Deletes from auth.users (cascades to profiles, products, sales, etc.)
- Only callable by admin users

## Notes
1. Cascade deletion is handled via existing ON DELETE CASCADE on foreign keys
2. Deleting a user from auth.users automatically deletes their profile
3. Admin function uses SECURITY DEFINER to bypass RLS during deletion
*/

-- 1. Add status column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

-- 2. Create customers table for end-customers
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  total_orders integer NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone) WHERE phone != '';

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Customer policies for regular users (shop owners)
DROP POLICY IF EXISTS "select_own_customers" ON public.customers;
CREATE POLICY "select_own_customers" ON public.customers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_customers" ON public.customers;
CREATE POLICY "insert_own_customers" ON public.customers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_customers" ON public.customers;
CREATE POLICY "update_own_customers" ON public.customers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_customers" ON public.customers;
CREATE POLICY "delete_own_customers" ON public.customers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Admin policies for customers table
DROP POLICY IF EXISTS "admin_select_all_customers" ON public.customers;
CREATE POLICY "admin_select_all_customers" ON public.customers FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_all_customers" ON public.customers;
CREATE POLICY "admin_update_all_customers" ON public.customers FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_all_customers" ON public.customers;
CREATE POLICY "admin_delete_all_customers" ON public.customers FOR DELETE
  TO authenticated USING (public.is_admin());

-- 3. Create admin function to delete user with cascade
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;
  
  -- Prevent admin from deleting themselves
  IF target_user_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Cannot delete your own account');
  END IF;
  
  -- Get profile info before deletion for response
  SELECT json_build_object(
    'id', p.id,
    'shop_name', p.shop_name,
    'user_id', p.user_id
  ) INTO result
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
  
  -- Delete from auth.users (this cascades to profiles, products, sales, etc.)
  -- We use raw SQL to delete from auth schema
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN json_build_object(
    'success', true, 
    'deleted_user', result
  );
END;
$$;

-- 4. Update profiles policies to allow admin to update status
-- (Existing admin policies already allow this, but let's ensure delete works)
DROP POLICY IF EXISTS "delete_all_profiles_admin" ON public.profiles;
CREATE POLICY "delete_all_profiles_admin" ON public.profiles FOR DELETE
  TO authenticated USING (public.is_admin());