/*
# Add admin access to shop data tables

## Summary
Allows admin users to SELECT, UPDATE, and DELETE data in products, 
purchases, sales, and sale_items tables for shop management.

## Security
- Uses the existing is_admin() helper function
- Admins can manage all rows; regular users retain own-row-only access
*/

-- Products: admin can SELECT all rows
DROP POLICY IF EXISTS "select_all_products_admin" ON public.products;
CREATE POLICY "select_all_products_admin"
  ON public.products FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- Products: admin can UPDATE all rows
DROP POLICY IF EXISTS "update_all_products_admin" ON public.products;
CREATE POLICY "update_all_products_admin"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

-- Products: admin can DELETE all rows
DROP POLICY IF EXISTS "delete_all_products_admin" ON public.products;
CREATE POLICY "delete_all_products_admin"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- Purchases: admin can SELECT all rows
DROP POLICY IF EXISTS "select_all_purchases_admin" ON public.purchases;
CREATE POLICY "select_all_purchases_admin"
  ON public.purchases FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- Purchases: admin can DELETE all rows (to correct errors)
DROP POLICY IF EXISTS "delete_all_purchases_admin" ON public.purchases;
CREATE POLICY "delete_all_purchases_admin"
  ON public.purchases FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- Sales: admin can SELECT all rows
DROP POLICY IF EXISTS "select_all_sales_admin" ON public.sales;
CREATE POLICY "select_all_sales_admin"
  ON public.sales FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- Sales: admin can DELETE all rows (to correct errors)
DROP POLICY IF EXISTS "delete_all_sales_admin" ON public.sales;
CREATE POLICY "delete_all_sales_admin"
  ON public.sales FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- Sale items: admin can SELECT all rows
DROP POLICY IF EXISTS "select_all_sale_items_admin" ON public.sale_items;
CREATE POLICY "select_all_sale_items_admin"
  ON public.sale_items FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
  );

-- Sale items: admin can DELETE all rows
DROP POLICY IF EXISTS "delete_all_sale_items_admin" ON public.sale_items;
CREATE POLICY "delete_all_sale_items_admin"
  ON public.sale_items FOR DELETE
  TO authenticated
  USING (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid())
  );
