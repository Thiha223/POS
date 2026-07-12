/*
# Add Admin Full Access Policies

## Summary
1. Add admin RLS policies for customers table
2. Add admin RLS policies for sales, sale_items, purchases, inventory_opening
3. Add admin RLS policies for subscription_requests
4. Ensure admin can read all profiles
*/

-- CUSTOMERS TABLE - Admin policies
DROP POLICY IF EXISTS "select_all_customers_admin" ON public.customers;
CREATE POLICY "select_all_customers_admin"
  ON public.customers FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_all_customers_admin" ON public.customers;
CREATE POLICY "insert_all_customers_admin"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "update_all_customers_admin" ON public.customers;
CREATE POLICY "update_all_customers_admin"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_all_customers_admin" ON public.customers;
CREATE POLICY "delete_all_customers_admin"
  ON public.customers FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- SALES TABLE - Admin policies
DROP POLICY IF EXISTS "select_all_sales_admin" ON public.sales;
CREATE POLICY "select_all_sales_admin"
  ON public.sales FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_all_sales_admin" ON public.sales;
CREATE POLICY "insert_all_sales_admin"
  ON public.sales FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "update_all_sales_admin" ON public.sales;
CREATE POLICY "update_all_sales_admin"
  ON public.sales FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_all_sales_admin" ON public.sales;
CREATE POLICY "delete_all_sales_admin"
  ON public.sales FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- PURCHASES TABLE - Admin policies
DROP POLICY IF EXISTS "select_all_purchases_admin" ON public.purchases;
CREATE POLICY "select_all_purchases_admin"
  ON public.purchases FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_all_purchases_admin" ON public.purchases;
CREATE POLICY "insert_all_purchases_admin"
  ON public.purchases FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "update_all_purchases_admin" ON public.purchases;
CREATE POLICY "update_all_purchases_admin"
  ON public.purchases FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_all_purchases_admin" ON public.purchases;
CREATE POLICY "delete_all_purchases_admin"
  ON public.purchases FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- INVENTORY OPENING - Admin policies
DROP POLICY IF EXISTS "select_all_inventory_admin" ON public.inventory_opening;
CREATE POLICY "select_all_inventory_admin"
  ON public.inventory_opening FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_all_inventory_admin" ON public.inventory_opening;
CREATE POLICY "insert_all_inventory_admin"
  ON public.inventory_opening FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "update_all_inventory_admin" ON public.inventory_opening;
CREATE POLICY "update_all_inventory_admin"
  ON public.inventory_opening FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_all_inventory_admin" ON public.inventory_opening;
CREATE POLICY "delete_all_inventory_admin"
  ON public.inventory_opening FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- SUBSCRIPTION REQUESTS - Admin full access
DROP POLICY IF EXISTS "select_all_sub_requests_admin" ON public.subscription_requests;
CREATE POLICY "select_all_sub_requests_admin"
  ON public.subscription_requests FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_all_sub_requests_admin" ON public.subscription_requests;
CREATE POLICY "insert_all_sub_requests_admin"
  ON public.subscription_requests FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "update_all_sub_requests_admin" ON public.subscription_requests;
CREATE POLICY "update_all_sub_requests_admin"
  ON public.subscription_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_all_sub_requests_admin" ON public.subscription_requests;
CREATE POLICY "delete_all_sub_requests_admin"
  ON public.subscription_requests FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- PROFILES - Admin full access
DROP POLICY IF EXISTS "select_all_profiles_admin" ON public.profiles;
CREATE POLICY "select_all_profiles_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_all_profiles_admin" ON public.profiles;
CREATE POLICY "insert_all_profiles_admin"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "update_all_profiles_admin" ON public.profiles;
CREATE POLICY "update_all_profiles_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_all_profiles_admin" ON public.profiles;
CREATE POLICY "delete_all_profiles_admin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- SALE ITEMS - Admin policies (via sale ownership)
DROP POLICY IF EXISTS "select_all_sale_items_admin" ON public.sale_items;
CREATE POLICY "select_all_sale_items_admin"
  ON public.sale_items FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_all_sale_items_admin" ON public.sale_items;
CREATE POLICY "insert_all_sale_items_admin"
  ON public.sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_all_sale_items_admin" ON public.sale_items;
CREATE POLICY "update_all_sale_items_admin"
  ON public.sale_items FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_all_sale_items_admin" ON public.sale_items;
CREATE POLICY "delete_all_sale_items_admin"
  ON public.sale_items FOR DELETE
  TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
  );