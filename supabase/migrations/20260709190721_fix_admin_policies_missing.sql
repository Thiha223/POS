/*
# Fix missing admin policies

## Summary
Adds missing admin policies for:
- sale_items UPDATE (admin can update sale items)
- inventory_opening (admin can manage all inventory opening records)
*/

-- Sale items: admin can UPDATE all rows
DROP POLICY IF EXISTS "update_all_sale_items_admin" ON public.sale_items;
CREATE POLICY "update_all_sale_items_admin"
  ON public.sale_items FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Inventory opening: admin can SELECT all rows
DROP POLICY IF EXISTS "select_all_inventory_opening_admin" ON public.inventory_opening;
CREATE POLICY "select_all_inventory_opening_admin"
  ON public.inventory_opening FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- Inventory opening: admin can UPDATE all rows
DROP POLICY IF EXISTS "update_all_inventory_opening_admin" ON public.inventory_opening;
CREATE POLICY "update_all_inventory_opening_admin"
  ON public.inventory_opening FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

-- Inventory opening: admin can DELETE all rows
DROP POLICY IF EXISTS "delete_all_inventory_opening_admin" ON public.inventory_opening;
CREATE POLICY "delete_all_inventory_opening_admin"
  ON public.inventory_opening FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- Inventory opening: admin can INSERT for any user
DROP POLICY IF EXISTS "insert_all_inventory_opening_admin" ON public.inventory_opening;
CREATE POLICY "insert_all_inventory_opening_admin"
  ON public.inventory_opening FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);
